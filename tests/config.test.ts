import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'vitest';

import { getConfig, parseReleaseStream, validateNpmPackageName } from '@/config';

const INPUT_KEYS = [
  'INPUT_PATH',
  'INPUT_PACKAGE-NAME',
  'INPUT_RELEASE-STREAM',
  'INPUT_TARBALL-URI',
  'INPUT_FILES',
  'INPUT_OUTPUT-FILE',
  'INPUT_MARKDOWN-OUTPUT-FILE',
];

async function withInputs<T>(inputs: Record<string, string>, callback: () => T): Promise<T> {
  const previous = new Map(INPUT_KEYS.map((key) => [key, process.env[key]]));

  try {
    for (const key of INPUT_KEYS) {
      delete process.env[key];
    }

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
  assert.throws(() => validateNpmPackageName('@scope/name:latest'), /Invalid npm package name/);
  assert.throws(() => validateNpmPackageName('npm:axios@latest'), /Invalid npm package name/);
});

test('parseReleaseStream accepts empty and non-negative integer streams', () => {
  assert.equal(parseReleaseStream(''), undefined);
  assert.equal(parseReleaseStream(' 0 '), 0);
  assert.equal(parseReleaseStream('1'), 1);
});

test('parseReleaseStream rejects non-integer and negative streams', () => {
  assert.throws(() => parseReleaseStream('1.x'), /Invalid release-stream input/);
  assert.throws(() => parseReleaseStream('1.0'), /Invalid release-stream input/);
  assert.throws(() => parseReleaseStream('-1'), /Invalid release-stream input/);
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
        releaseStream: undefined,
        filePaths: ['dist/a.js', 'dist/b.js'],
        outputFile: 'bundle-size-comparison.json',
        markdownOutputFile: 'bundle-size-comparison.md',
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
      'INPUT_MARKDOWN-OUTPUT-FILE': 'reports/result.md',
    },
    () => {
      assert.deepEqual(getConfig(), {
        localRoot: path.resolve('fixtures/project'),
        packageName: '@scope/package',
        releaseStream: undefined,
        filePaths: ['dist/a.js'],
        outputFile: 'reports/result.json',
        markdownOutputFile: 'reports/result.md',
      });
    },
  );
});

test('getConfig reads valid release stream inputs', async () => {
  await withInputs(
    {
      'INPUT_PACKAGE-NAME': 'axios',
      'INPUT_RELEASE-STREAM': '0',
      INPUT_FILES: 'dist/a.js',
    },
    () => {
      assert.equal(getConfig().releaseStream, 0);
    },
  );

  await withInputs(
    {
      'INPUT_PACKAGE-NAME': 'axios',
      'INPUT_RELEASE-STREAM': '1',
      INPUT_FILES: 'dist/a.js',
    },
    () => {
      assert.equal(getConfig().releaseStream, 1);
    },
  );
});

test('getConfig rejects invalid release stream inputs', async () => {
  await withInputs(
    {
      'INPUT_PACKAGE-NAME': 'axios',
      'INPUT_RELEASE-STREAM': 'latest',
      INPUT_FILES: 'dist/a.js',
    },
    () => {
      assert.throws(() => getConfig(), /Invalid release-stream input/);
    },
  );

  await withInputs(
    {
      'INPUT_PACKAGE-NAME': 'axios',
      'INPUT_RELEASE-STREAM': '-1',
      INPUT_FILES: 'dist/a.js',
    },
    () => {
      assert.throws(() => getConfig(), /Invalid release-stream input/);
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

test('getConfig rejects invalid markdown output file paths', async () => {
  await withInputs(
    {
      'INPUT_PACKAGE-NAME': 'axios',
      INPUT_FILES: 'dist/a.js',
      'INPUT_MARKDOWN-OUTPUT-FILE': '../result.md',
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
