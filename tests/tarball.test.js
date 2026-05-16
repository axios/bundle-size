import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

import {
  createTarballFileMap,
  downloadTarball,
  extractTarGzEntries,
} from '../lib/tarball.js';

function writeOctal(buffer, value, offset, length) {
  const octal = value.toString(8).padStart(length - 1, '0');
  buffer.write(`${octal}\0`, offset, length, 'ascii');
}

function createHeader(entryPath, size, type = '0') {
  const header = Buffer.alloc(512);

  header.write(entryPath, 0, 100, 'utf8');
  writeOctal(header, 0o644, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, size, 124, 12);
  writeOctal(header, 0, 136, 12);
  header.fill(' ', 148, 156);
  header.write(type, 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');

  const checksum = [...header].reduce((total, byte) => total + byte, 0);
  header.write(checksum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
  header[154] = 0;
  header[155] = 32;

  return header;
}

function createTar(entries) {
  const blocks = [];

  for (const entry of entries) {
    const content = Buffer.from(entry.content || '');
    const header = createHeader(entry.path, content.length, entry.type || '0');

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
  const header = createHeader(entryPath, 0);

  header.fill(0, 124, 136);
  header.write(rawSize, 124, 12, 'ascii');

  return Buffer.concat([header, Buffer.alloc(1024)]);
}

test('downloadTarball returns response bytes', async () => {
  const originalFetch = global.fetch;
  const content = Buffer.from('archive');

  try {
    global.fetch = async (uri) => {
      assert.equal(uri, 'https://example.com/archive.tgz');

      return {
        ok: true,
        arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
      };
    };

    assert.deepEqual(await downloadTarball('https://example.com/archive.tgz'), content);
  } finally {
    global.fetch = originalFetch;
  }
});

test('downloadTarball fails clearly for rejected fetches and HTTP errors', async () => {
  const originalFetch = global.fetch;

  try {
    global.fetch = async () => {
      throw new Error('network down');
    };

    await assert.rejects(
      downloadTarball('https://example.com/archive.tgz'),
      /Failed to download tarball URI https:\/\/example\.com\/archive\.tgz: network down/,
    );

    global.fetch = async () => ({ ok: false, status: 404, statusText: 'Not Found' });

    await assert.rejects(
      downloadTarball('https://example.com/archive.tgz'),
      /HTTP 404 Not Found/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('extractTarGzEntries extracts regular files and ignores directories', async () => {
  const archive = gzipSync(createTar([
    { path: 'package/dist/', type: '5' },
    { path: 'package/dist/a.js', content: 'baseline' },
  ]));

  assert.deepEqual(await extractTarGzEntries(archive), [
    { path: 'package/dist/a.js', content: Buffer.from('baseline') },
  ]);
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

test('extractTarGzEntries fails clearly for truncated entries and empty archives', async () => {
  await assert.rejects(
    extractTarGzEntries(gzipSync(Buffer.concat([createHeader('dist/a.js', 2048), Buffer.alloc(1024)]))),
    /Tarball entry is truncated: dist\/a\.js/,
  );

  await assert.rejects(
    extractTarGzEntries(gzipSync(createTar([{ path: 'package/dist/', type: '5' }]))),
    /did not contain any regular files/,
  );
});

test('createTarballFileMap strips only a single shared top-level directory', async () => {
  const singleRootMap = createTarballFileMap(
    await extractTarGzEntries(gzipSync(createTar([
      { path: 'package/dist/a.js', content: 'baseline-a' },
      { path: 'package/dist/b.js', content: 'baseline-b' },
    ]))),
  );

  assert.equal(singleRootMap.get('package/dist/a.js').toString(), 'baseline-a');
  assert.equal(singleRootMap.get('dist/a.js').toString(), 'baseline-a');

  const multipleRootMap = createTarballFileMap([
    { path: 'package/dist/a.js', content: Buffer.from('baseline-a') },
    { path: 'other/dist/a.js', content: Buffer.from('baseline-other') },
  ]);

  assert.equal(multipleRootMap.has('dist/a.js'), false);
});
