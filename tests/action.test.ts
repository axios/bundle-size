import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { test } from 'vitest';

import { run } from '@/action';
import type { ComparisonReport } from '@/types';

const AXIOS_METADATA_URL = 'https://registry.npmjs.org/axios';
const AXIOS_LATEST_TARBALL_URL = 'https://registry.npmjs.org/axios/-/axios-1.12.2.tgz';
const AXIOS_PREVIOUS_TARBALL_URL = 'https://registry.npmjs.org/axios/-/axios-1.12.1.tgz';
const AXIOS_NEXT_TARBALL_URL = 'https://registry.npmjs.org/axios/-/axios-2.0.0.tgz';

function writeOctal(buffer: Buffer, value: number, offset: number, length: number): void {
  const octal = value.toString(8).padStart(length - 1, '0');
  buffer.write(`${octal}\0`, offset, length, 'ascii');
}

function createTar(entries: [string, string][]): Buffer {
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

function parseGithubOutput(content: string): Map<string, string> {
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

async function withActionEnvironment<T>(
  env: Record<string, string>,
  callback: () => Promise<T>,
): Promise<T> {
  const keys = [
    'GITHUB_OUTPUT',
    'INPUT_PATH',
    'INPUT_PACKAGE-NAME',
    'INPUT_RELEASE-STREAM',
    'INPUT_FILES',
    'INPUT_OUTPUT-FILE',
    'INPUT_COMMENT-PR',
    'INPUT_GITHUB-TOKEN',
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  const previousExitCode = process.exitCode;

  try {
    process.exitCode = undefined;

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
      process.exitCode = undefined;
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

test('run writes outputs and a comparison report for mocked axios npm releases', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-action-'));
  const outputFile = path.join(tempRoot, 'github-output.txt');
  const originalFetch = global.fetch;
  let exitCode: number | string | null | undefined;

  try {
    await mkdir(path.join(tempRoot, 'dist'), { recursive: true });
    await writeFile(path.join(tempRoot, 'dist/axios.min.js'), 'current axios artifact');
    await writeFile(outputFile, '');

    const latestArchive = gzipSync(createTar([
      ['package/dist/axios.min.js', 'baseline axios artifact'],
    ]));
    const previousArchive = gzipSync(createTar([
      ['package/dist/axios.min.js', 'previous axios artifact'],
    ]));

    global.fetch = async (uri) => {
      if (uri === AXIOS_METADATA_URL) {
        return Response.json({
          'dist-tags': { latest: '1.12.2' },
          versions: {
            '1.12.1': { dist: { tarball: AXIOS_PREVIOUS_TARBALL_URL } },
            '1.12.2': { dist: { tarball: AXIOS_LATEST_TARBALL_URL } },
          },
          time: {
            '1.12.1': '2025-09-01T00:00:00.000Z',
            '1.12.2': '2025-09-02T00:00:00.000Z',
          },
        });
      }

      if (uri === AXIOS_LATEST_TARBALL_URL) {
        return new Response(
          latestArchive.buffer.slice(
            latestArchive.byteOffset,
            latestArchive.byteOffset + latestArchive.byteLength,
          ),
          {
            status: 200,
          },
        );
      }

      assert.equal(uri, AXIOS_PREVIOUS_TARBALL_URL);

      return new Response(
        previousArchive.buffer.slice(
          previousArchive.byteOffset,
          previousArchive.byteOffset + previousArchive.byteLength,
        ),
        {
          status: 200,
        },
      );
    };

    await withActionEnvironment(
      {
        GITHUB_OUTPUT: outputFile,
        INPUT_PATH: tempRoot,
        'INPUT_PACKAGE-NAME': 'axios',
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
    const report = JSON.parse(await readFile(comparisonFile, 'utf8')) as ComparisonReport;

    assert.equal(outputs.get('comparison-file'), comparisonFile);
    assert.equal(outputs.get('size'), String(report.totals.currentBytes));
    assert.equal(outputs.get('total-current-gzip-size'), String(report.totals.currentBytes));
    assert.equal(outputs.get('total-baseline-gzip-size'), String(report.totals.baselineBytes));
    assert.equal(outputs.get('total-delta-gzip-size'), String(report.totals.deltaBytes));
    assert.equal(report.packageName, 'axios');
    assert.equal(report.baseline.version, '1.12.2');
    assert.equal(report.baseline.uri, AXIOS_LATEST_TARBALL_URL);
    assert.deepEqual(report.history.map((release) => release.version), ['1.12.2', '1.12.1']);
    assert.deepEqual(report.files.map((file) => file.path), ['dist/axios.min.js']);
  } finally {
    global.fetch = originalFetch;
    await rm(tempRoot, { force: true, recursive: true });
  }
});

test('run resolves npm baselines from a configured release stream', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-action-'));
  const outputFile = path.join(tempRoot, 'github-output.txt');
  const originalFetch = global.fetch;
  let exitCode: number | string | null | undefined;

  try {
    await mkdir(path.join(tempRoot, 'dist'), { recursive: true });
    await writeFile(path.join(tempRoot, 'dist/axios.min.js'), 'current axios artifact');
    await writeFile(outputFile, '');

    const streamLatestArchive = gzipSync(createTar([
      ['package/dist/axios.min.js', 'stream baseline axios artifact'],
    ]));
    const previousArchive = gzipSync(createTar([
      ['package/dist/axios.min.js', 'previous axios artifact'],
    ]));

    global.fetch = async (uri) => {
      if (uri === AXIOS_METADATA_URL) {
        return Response.json({
          'dist-tags': { latest: '2.0.0' },
          versions: {
            '1.12.1': { dist: { tarball: AXIOS_PREVIOUS_TARBALL_URL } },
            '1.12.2': { dist: { tarball: AXIOS_LATEST_TARBALL_URL } },
            '2.0.0': { dist: { tarball: AXIOS_NEXT_TARBALL_URL } },
          },
          time: {
            '1.12.1': '2025-09-01T00:00:00.000Z',
            '1.12.2': '2025-09-02T00:00:00.000Z',
            '2.0.0': '2025-10-01T00:00:00.000Z',
          },
        });
      }

      if (uri === AXIOS_LATEST_TARBALL_URL) {
        return new Response(
          streamLatestArchive.buffer.slice(
            streamLatestArchive.byteOffset,
            streamLatestArchive.byteOffset + streamLatestArchive.byteLength,
          ),
          { status: 200 },
        );
      }

      assert.equal(uri, AXIOS_PREVIOUS_TARBALL_URL);

      return new Response(
        previousArchive.buffer.slice(
          previousArchive.byteOffset,
          previousArchive.byteOffset + previousArchive.byteLength,
        ),
        { status: 200 },
      );
    };

    await withActionEnvironment(
      {
        GITHUB_OUTPUT: outputFile,
        INPUT_PATH: tempRoot,
        'INPUT_PACKAGE-NAME': 'axios',
        'INPUT_RELEASE-STREAM': '1',
        INPUT_FILES: 'dist/axios.min.js',
        'INPUT_OUTPUT-FILE': 'reports/comparison.json',
      },
      async () => {
        await run();
        exitCode = process.exitCode;
      },
    );

    assert.equal(exitCode, undefined);

    const report = JSON.parse(
      await readFile(path.join(tempRoot, 'reports/comparison.json'), 'utf8'),
    ) as ComparisonReport;

    assert.equal(report.releaseStream, 1);
    assert.equal(report.baseline.version, '1.12.2');
    assert.deepEqual(report.history.map((release) => release.version), ['1.12.2', '1.12.1']);
  } finally {
    global.fetch = originalFetch;
    await rm(tempRoot, { force: true, recursive: true });
  }
});
