import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'vitest';

import { getConfig, validateTarballUri } from '@/config';

const INPUT_KEYS = [
  'INPUT_PATH',
  'INPUT_TARBALL-URI',
  'INPUT_FILES',
  'INPUT_OUTPUT-FILE',
  'INPUT_COMMENT-PR',
  'INPUT_GITHUB-TOKEN',
];

async function withInputs<T>(inputs: Record<string, string>, callback: () => T): Promise<T> {
  const previous = new Map(INPUT_KEYS.map((key) => [key, process.env[key]]));

  try {
    for (const key of INPUT_KEYS) {
      delete process.env[key];
    }

    process.env['INPUT_COMMENT-PR'] = 'false';

    for (const [key, value] of Object.entries(inputs)) {
      process.env[key] = value;
    }

    return await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('validateTarballUri accepts HTTP and HTTPS tarball URIs', () => {
  assert.equal(validateTarballUri(' https://example.com/archive.tgz '), 'https://example.com/archive.tgz');
  assert.equal(validateTarballUri('http://example.com/archive.tgz'), 'http://example.com/archive.tgz');
});

test('validateTarballUri rejects missing, invalid, and unsupported URIs', () => {
  assert.throws(() => validateTarballUri(''), /tarball-uri input is required/);
  assert.throws(() => validateTarballUri('not a url'), /Invalid tarball URI/);
  assert.throws(() => validateTarballUri('file:///tmp/archive.tgz'), /Unsupported tarball URI protocol/);
});

test('getConfig reads defaults and parses multiline files input', async () => {
  await withInputs(
    {
      'INPUT_TARBALL-URI': 'https://example.com/archive.tgz',
      INPUT_FILES: 'dist/a.js\n./dist/a.js\ndist/b.js',
    },
    () => {
      assert.deepEqual(getConfig(), {
        localRoot: path.resolve('.'),
        tarballUri: 'https://example.com/archive.tgz',
        filePaths: ['dist/a.js', 'dist/b.js'],
        outputFile: 'bundle-size-comparison.json',
        commentPr: false,
        githubToken: '',
      });
    },
  );
});

test('getConfig reads explicit path and output file inputs', async () => {
  await withInputs(
    {
      INPUT_PATH: 'fixtures/project',
      'INPUT_TARBALL-URI': 'https://example.com/archive.tgz',
      INPUT_FILES: 'dist/a.js',
      'INPUT_OUTPUT-FILE': 'reports/result.json',
    },
    () => {
      assert.deepEqual(getConfig(), {
        localRoot: path.resolve('fixtures/project'),
        tarballUri: 'https://example.com/archive.tgz',
        filePaths: ['dist/a.js'],
        outputFile: 'reports/result.json',
        commentPr: false,
        githubToken: '',
      });
    },
  );
});

test('getConfig reads PR comment inputs', async () => {
  await withInputs(
    {
      'INPUT_TARBALL-URI': 'https://example.com/archive.tgz',
      INPUT_FILES: 'dist/a.js',
      'INPUT_COMMENT-PR': 'true',
      'INPUT_GITHUB-TOKEN': 'token-value',
    },
    () => {
      assert.deepEqual(getConfig(), {
        localRoot: path.resolve('.'),
        tarballUri: 'https://example.com/archive.tgz',
        filePaths: ['dist/a.js'],
        outputFile: 'bundle-size-comparison.json',
        commentPr: true,
        githubToken: 'token-value',
      });
    },
  );
});

test('getConfig requires github-token when PR comments are enabled', async () => {
  await withInputs(
    {
      'INPUT_TARBALL-URI': 'https://example.com/archive.tgz',
      INPUT_FILES: 'dist/a.js',
      'INPUT_COMMENT-PR': 'true',
    },
    () => {
      assert.throws(() => getConfig(), /github-token input is required/);
    },
  );
});

test('getConfig rejects invalid output file paths', async () => {
  await withInputs(
    {
      'INPUT_TARBALL-URI': 'https://example.com/archive.tgz',
      INPUT_FILES: 'dist/a.js',
      'INPUT_OUTPUT-FILE': '../result.json',
    },
    () => {
      assert.throws(() => getConfig(), /must be relative/);
    },
  );
});
