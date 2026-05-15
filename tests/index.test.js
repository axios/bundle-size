const assert = require('node:assert/strict');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { gzipSync } = require('node:zlib');

const { buildComparisonReport } = require('../lib/comparison.js');
const { validateTarballUri } = require('../lib/config.js');
const { parseFilePaths, resolveInsideRoot } = require('../lib/paths.js');
const { createTarballFileMap, extractTarGzEntries } = require('../lib/tarball.js');

function writeOctal(buffer, value, offset, length) {
  const octal = value.toString(8).padStart(length - 1, '0');
  buffer.write(`${octal}\0`, offset, length, 'ascii');
}

function createTar(entries) {
  const blocks = [];

  for (const [entryPath, contentValue] of entries) {
    const content = Buffer.from(contentValue);
    const header = Buffer.alloc(512);

    header.write(entryPath, 0, 100, 'utf8');
    writeOctal(header, 0o644, 100, 8);
    writeOctal(header, 0, 108, 8);
    writeOctal(header, 0, 116, 8);
    writeOctal(header, content.length, 124, 12);
    writeOctal(header, 0, 136, 12);
    header.fill(' ', 148, 156);
    header.write('0', 156, 1, 'ascii');
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');

    const checksum = [...header].reduce((total, byte) => total + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
    header[154] = 0;
    header[155] = 32;

    blocks.push(header, content);

    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) {
      blocks.push(Buffer.alloc(padding));
    }
  }

  blocks.push(Buffer.alloc(1024));

  return Buffer.concat(blocks);
}

function createTarWithRawSize(entryPath, rawSize) {
  const header = Buffer.alloc(512);

  header.write(entryPath, 0, 100, 'utf8');
  writeOctal(header, 0o644, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  header.write(rawSize, 124, 12, 'ascii');
  writeOctal(header, 0, 136, 12);
  header.fill(' ', 148, 156);
  header.write('0', 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');

  const checksum = [...header].reduce((total, byte) => total + byte, 0);
  header.write(checksum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
  header[154] = 0;
  header[155] = 32;

  return Buffer.concat([header, Buffer.alloc(1024)]);
}

test('parseFilePaths returns normalized unique relative paths', () => {
  assert.deepEqual(parseFilePaths('dist/a.js\n./dist/a.js\ndist/b.js\n'), ['dist/a.js', 'dist/b.js']);
});

test('parseFilePaths rejects missing and unsafe paths', () => {
  assert.throws(() => parseFilePaths('\n'), /At least one file path/);
  assert.throws(() => parseFilePaths('../dist/a.js'), /must be relative/);
  assert.throws(() => parseFilePaths('C:\\dist\\a.js'), /must be relative/);
  assert.throws(() => parseFilePaths('C:/dist/a.js'), /must be relative/);
  assert.throws(() => parseFilePaths('\\\\server\\share\\a.js'), /must be relative/);
  assert.throws(() => parseFilePaths('//server/share/a.js'), /must be relative/);
});

test('resolveInsideRoot allows in-root paths that start with dots', () => {
  const root = path.join(os.tmpdir(), 'bundle-size-root');

  assert.equal(resolveInsideRoot(root, '..foo/a.js'), path.join(root, '..foo/a.js'));
  assert.throws(() => resolveInsideRoot(root, '../a.js'), /stay inside/);
  assert.throws(() => resolveInsideRoot(root, '..'), /stay inside/);
});

test('validateTarballUri accepts HTTP and HTTPS tarball URIs', () => {
  assert.equal(validateTarballUri(' https://example.com/archive.tgz '), 'https://example.com/archive.tgz');
  assert.equal(validateTarballUri('http://example.com/archive.tgz'), 'http://example.com/archive.tgz');
});

test('validateTarballUri rejects missing, invalid, and unsupported URIs', () => {
  assert.throws(() => validateTarballUri(''), /tarball-uri input is required/);
  assert.throws(() => validateTarballUri('not a url'), /Invalid tarball URI/);
  assert.throws(() => validateTarballUri('file:///tmp/archive.tgz'), /Unsupported tarball URI protocol/);
});

test('tarball file map strips a single package root directory', async () => {
  const archive = gzipSync(createTar([['package/dist/a.js', 'baseline']]));
  const fileMap = createTarballFileMap(await extractTarGzEntries(archive));

  assert.equal(fileMap.get('dist/a.js').toString(), 'baseline');
});

test('extractTarGzEntries fails clearly for invalid gzip payloads', async () => {
  await assert.rejects(
    extractTarGzEntries(Buffer.from('<html>not a tarball</html>')),
    /not a valid \.tar\.gz archive/,
  );
});

test('extractTarGzEntries fails clearly for malformed tar size fields', async () => {
  const archive = gzipSync(createTarWithRawSize('package/dist/a.js', 'invalid'));

  await assert.rejects(
    extractTarGzEntries(archive),
    /invalid size field: package\/dist\/a\.js/,
  );
});

test('buildComparisonReport measures gzip sizes and deltas', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    await writeFile(path.join(localRoot, 'dist-a.js'), 'current artifact');

    const report = await buildComparisonReport(
      localRoot,
      'https://example.com/archive.tgz',
      ['dist-a.js'],
      new Map([['dist-a.js', Buffer.from('baseline artifact')]]),
    );

    assert.equal(report.metric, 'gzip');
    assert.equal(report.baseline.uri, 'https://example.com/archive.tgz');
    assert.equal(report.files.length, 1);
    assert.equal(report.files[0].deltaBytes, report.files[0].currentBytes - report.files[0].baselineBytes);
    assert.equal(report.totals.deltaBytes, report.totals.currentBytes - report.totals.baselineBytes);
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});

test('buildComparisonReport fails when baseline file is missing', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    await writeFile(path.join(localRoot, 'dist-a.js'), 'current artifact');

    await assert.rejects(
      buildComparisonReport(localRoot, 'https://example.com/archive.tgz', ['dist-a.js'], new Map()),
      /Baseline file not found/,
    );
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});

test('buildComparisonReport fails when local file is missing', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    await assert.rejects(
      buildComparisonReport(
        localRoot,
        'https://example.com/archive.tgz',
        ['dist-a.js'],
        new Map([['dist-a.js', Buffer.from('baseline artifact')]]),
      ),
      /Local file not found: dist-a\.js/,
    );
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});
