import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  getNpmPackageMetadataUrl,
  resolveNpmReleaseBaselines,
  selectNpmReleaseBaselines,
} from '@/npm';

function createMetadata(versions: string[], latest = versions.at(-1)): object {
  return {
    'dist-tags': { latest },
    versions: Object.fromEntries(
      versions.map((version) => [
        version,
        {
          dist: {
            tarball: `https://registry.npmjs.org/axios/-/axios-${version}.tgz`,
          },
        },
      ]),
    ),
    time: Object.fromEntries(
      versions.map((version, index) => [
        version,
        new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
      ]),
    ),
  };
}

test('getNpmPackageMetadataUrl encodes scoped package names', () => {
  assert.equal(
    getNpmPackageMetadataUrl('@scope/package'),
    'https://registry.npmjs.org/%40scope%2Fpackage',
  );
});

test('selectNpmReleaseBaselines selects latest plus fewer than 10 previous releases', () => {
  const releases = selectNpmReleaseBaselines('axios', createMetadata(['1.0.0', '1.1.0', '1.2.0']));

  assert.deepEqual(releases.map((release) => release.version), ['1.2.0', '1.1.0', '1.0.0']);
  assert.equal(releases[0].latest, true);
  assert.equal(releases[1].latest, false);
});

test('selectNpmReleaseBaselines preserves latest behavior without release stream', () => {
  const releases = selectNpmReleaseBaselines(
    'axios',
    createMetadata(['0.27.2', '1.0.0', '1.1.0', '2.0.0'], '2.0.0'),
  );

  assert.deepEqual(releases.map((release) => release.version), [
    '2.0.0',
    '1.1.0',
    '1.0.0',
    '0.27.2',
  ]);
});

test('selectNpmReleaseBaselines selects at most 10 previous stable releases', () => {
  const versions = Array.from({ length: 13 }, (_, index) => `1.${index}.0`);
  const releases = selectNpmReleaseBaselines('axios', createMetadata(versions));

  assert.equal(releases.length, 11);
  assert.deepEqual(releases.map((release) => release.version), [
    '1.12.0',
    '1.11.0',
    '1.10.0',
    '1.9.0',
    '1.8.0',
    '1.7.0',
    '1.6.0',
    '1.5.0',
    '1.4.0',
    '1.3.0',
    '1.2.0',
  ]);
});

test('selectNpmReleaseBaselines skips prerelease versions in previous releases', () => {
  const releases = selectNpmReleaseBaselines(
    'axios',
    createMetadata(['1.0.0', '1.1.0-beta.1', '1.1.0']),
  );

  assert.deepEqual(releases.map((release) => release.version), ['1.1.0', '1.0.0']);
});

test('selectNpmReleaseBaselines filters baselines to a release stream', () => {
  const releases = selectNpmReleaseBaselines(
    'axios',
    createMetadata(['0.27.2', '1.0.0', '1.1.0', '2.0.0'], '2.0.0'),
    1,
  );

  assert.deepEqual(releases.map((release) => release.version), ['1.1.0', '1.0.0']);
  assert.equal(releases[0].latest, true);
  assert.equal(releases[1].latest, false);
});

test('selectNpmReleaseBaselines uses newest stream release instead of npm latest', () => {
  const releases = selectNpmReleaseBaselines(
    'axios',
    createMetadata(['0.27.2', '1.0.0', '1.1.0', '2.0.0'], '2.0.0'),
    0,
  );

  assert.deepEqual(releases.map((release) => release.version), ['0.27.2']);
  assert.equal(releases[0].latest, true);
});

test('selectNpmReleaseBaselines limits previous releases within the stream', () => {
  const releases = selectNpmReleaseBaselines(
    'axios',
    createMetadata([
      '1.0.0',
      '2.0.0',
      '1.1.0',
      '1.2.0',
      '1.3.0',
      '1.4.0',
      '1.5.0',
      '1.6.0',
      '1.7.0',
      '1.8.0',
      '1.9.0',
      '1.10.0',
      '1.11.0',
      '1.12.0',
    ]),
    1,
  );

  assert.equal(releases.length, 11);
  assert.deepEqual(releases.map((release) => release.version), [
    '1.12.0',
    '1.11.0',
    '1.10.0',
    '1.9.0',
    '1.8.0',
    '1.7.0',
    '1.6.0',
    '1.5.0',
    '1.4.0',
    '1.3.0',
    '1.2.0',
  ]);
});

test('selectNpmReleaseBaselines rejects streams with no stable matches', () => {
  assert.throws(
    () => selectNpmReleaseBaselines('axios', createMetadata(['1.0.0', '2.0.0']), 0),
    /axios has no stable releases in release stream 0/,
  );
});

test('selectNpmReleaseBaselines rejects missing latest metadata', () => {
  assert.throws(
    () => selectNpmReleaseBaselines('axios', createMetadata(['1.0.0'], '2.0.0')),
    /does not define a usable latest release/,
  );
});

test('selectNpmReleaseBaselines rejects missing tarball URLs', () => {
  assert.throws(
    () => selectNpmReleaseBaselines('axios', {
      'dist-tags': { latest: '1.0.0' },
      versions: { '1.0.0': { dist: {} } },
      time: { '1.0.0': '2024-01-01T00:00:00.000Z' },
    }),
    /version 1\.0\.0 is missing a tarball URL/,
  );
});

test('resolveNpmReleaseBaselines fetches and parses npm metadata', async () => {
  const originalFetch = global.fetch;
  let requestedUrl = '';

  try {
    global.fetch = async (url) => {
      requestedUrl = String(url);

      return Response.json(createMetadata(['1.0.0', '1.1.0']));
    };

    const releases = await resolveNpmReleaseBaselines('@scope/package', 1);

    assert.equal(requestedUrl, 'https://registry.npmjs.org/%40scope%2Fpackage');
    assert.deepEqual(releases.map((release) => release.version), ['1.1.0', '1.0.0']);
  } finally {
    global.fetch = originalFetch;
  }
});

test('resolveNpmReleaseBaselines rejects failed registry responses', async () => {
  const originalFetch = global.fetch;

  try {
    global.fetch = async () => new Response('', { status: 404, statusText: 'Not Found' });

    await assert.rejects(
      resolveNpmReleaseBaselines('missing-package'),
      /Failed to fetch npm metadata for missing-package: HTTP 404 Not Found/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});
