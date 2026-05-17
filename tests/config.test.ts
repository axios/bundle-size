import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'vitest';

import { getConfig, validateNpmPackageName } from '@/config';

const INPUT_KEYS = [
  'INPUT_PATH',
  'INPUT_PACKAGE-NAME',
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

test('validateNpmPackageName accepts unscoped and scoped package names', () => {
  assert.equal(validateNpmPackageName(' axios '), 'axios');
  assert.equal(validateNpmPackageName('@scope/package'), '@scope/package');
});

test('validateNpmPackageName rejects missing and invalid package names', () => {
  assert.throws(() => validateNpmPackageName(''), /package-name input is required/);
  assert.throws(() => validateNpmPackageName('not a package'), /Invalid npm package name/);
  assert.throws(() => validateNpmPackageName('@scope'), /Invalid npm package name/);
  assert.throws(() => validateNpmPackageName('npm:axios@latest'), /Invalid npm package name/);
});

test('getConfig reads defaults and parses multiline files input', async () => {
  await withInputs(
    {
      'INPUT_PACKAGE-NAME': 'axios',
      INPUT_FILES: 'dist/a.js\n./dist/a.js\ndist/b.js',
    },
    () => {
      assert.deepEqual(getConfig(), {
        localRoot: path.resolve('.'),
        packageName: 'axios',
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
      'INPUT_PACKAGE-NAME': '@scope/package',
      INPUT_FILES: 'dist/a.js',
      'INPUT_OUTPUT-FILE': 'reports/result.json',
    },
    () => {
      assert.deepEqual(getConfig(), {
        localRoot: path.resolve('fixtures/project'),
        packageName: '@scope/package',
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
      'INPUT_PACKAGE-NAME': 'axios',
      INPUT_FILES: 'dist/a.js',
      'INPUT_COMMENT-PR': 'true',
      'INPUT_GITHUB-TOKEN': 'token-value',
    },
    () => {
      assert.deepEqual(getConfig(), {
        localRoot: path.resolve('.'),
        packageName: 'axios',
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
      'INPUT_PACKAGE-NAME': 'axios',
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
      'INPUT_PACKAGE-NAME': 'axios',
      INPUT_FILES: 'dist/a.js',
      'INPUT_OUTPUT-FILE': '../result.json',
    },
    () => {
      assert.throws(() => getConfig(), /must be relative/);
    },
  );
});

test('getConfig does not accept tarball-uri without package-name', async () => {
  await withInputs(
    {
      'INPUT_TARBALL-URI': 'https://example.com/archive.tgz',
      INPUT_FILES: 'dist/a.js',
    },
    () => {
      assert.throws(() => getConfig(), /package-name/);
    },
  );
});
