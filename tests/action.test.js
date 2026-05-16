const assert = require('node:assert/strict');
const { mkdir, mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { gzipSync } = require('node:zlib');

const { run } = require('../lib/action.js');

const AXIOS_TARBALL_URL = 'https://registry.npmjs.org/axios/-/axios-1.12.2.tgz';

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

function parseGithubOutput(content) {
  const outputs = new Map();
  const lines = content.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heredocMatch = /^(.*?)<<(.*)$/.exec(line);

    if (heredocMatch) {
      const [, name, delimiter] = heredocMatch;
      const valueLines = [];

      index += 1;
      while (index < lines.length && lines[index] !== delimiter) {
        valueLines.push(lines[index]);
        index += 1;
      }

      outputs.set(name, valueLines.join('\n'));
      continue;
    }

    const simpleMatch = /^(.*?)=(.*)$/.exec(line);
    if (simpleMatch) {
      outputs.set(simpleMatch[1], simpleMatch[2]);
    }
  }

  return outputs;
}

async function withActionEnvironment(env, callback) {
  const keys = [
    'GITHUB_OUTPUT',
    'INPUT_PATH',
    'INPUT_TARBALL-URI',
    'INPUT_FILES',
    'INPUT_OUTPUT-FILE',
    'INPUT_COMMENT-PR',
    'INPUT_GITHUB-TOKEN',
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  const previousExitCode = process.exitCode;

  try {
    delete process.exitCode;

    for (const key of keys) {
      delete process.env[key];
    }

    process.env['INPUT_COMMENT-PR'] = 'false';

    for (const [key, value] of Object.entries(env)) {
      process.env[key] = value;
    }

    return await callback();
  } finally {
    if (previousExitCode === undefined) {
      delete process.exitCode;
    } else {
      process.exitCode = previousExitCode;
    }

    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('run writes outputs and a comparison report for a mocked axios npm tarball', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-action-'));
  const outputFile = path.join(tempRoot, 'github-output.txt');
  const originalFetch = global.fetch;
  let exitCode;

  try {
    await mkdir(path.join(tempRoot, 'dist'), { recursive: true });
    await writeFile(path.join(tempRoot, 'dist/axios.min.js'), 'current axios artifact');
    await writeFile(outputFile, '');

    const archive = gzipSync(createTar([
      ['package/dist/axios.min.js', 'baseline axios artifact'],
    ]));

    global.fetch = async (uri) => {
      assert.equal(uri, AXIOS_TARBALL_URL);

      return {
        ok: true,
        arrayBuffer: async () => archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength),
      };
    };

    await withActionEnvironment(
      {
        GITHUB_OUTPUT: outputFile,
        INPUT_PATH: tempRoot,
        'INPUT_TARBALL-URI': AXIOS_TARBALL_URL,
        INPUT_FILES: 'dist/axios.min.js',
        'INPUT_OUTPUT-FILE': 'reports/comparison.json',
      },
      async () => {
        await run();
        exitCode = process.exitCode;
      },
    );

    assert.equal(exitCode, undefined);

    const outputs = parseGithubOutput(await readFile(outputFile, 'utf8'));
    const comparisonFile = path.join(tempRoot, 'reports/comparison.json');
    const report = JSON.parse(await readFile(comparisonFile, 'utf8'));

    assert.equal(outputs.get('comparison-file'), comparisonFile);
    assert.equal(outputs.get('size'), String(report.totals.currentBytes));
    assert.equal(outputs.get('total-current-gzip-size'), String(report.totals.currentBytes));
    assert.equal(outputs.get('total-baseline-gzip-size'), String(report.totals.baselineBytes));
    assert.equal(outputs.get('total-delta-gzip-size'), String(report.totals.deltaBytes));
    assert.equal(report.baseline.uri, AXIOS_TARBALL_URL);
    assert.deepEqual(report.files.map((file) => file.path), ['dist/axios.min.js']);
  } finally {
    global.fetch = originalFetch;
    await rm(tempRoot, { force: true, recursive: true });
  }
});
