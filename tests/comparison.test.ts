import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'vitest';

import { buildComparisonReport } from '@/comparison';

test('buildComparisonReport measures gzip sizes and deltas for multiple files', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    await writeFile(path.join(localRoot, 'dist-a.js'), 'current artifact');
    await writeFile(path.join(localRoot, 'dist-b.js'), 'current artifact with more content');

    const report = await buildComparisonReport(
      localRoot,
      'axios',
      ['dist-a.js', 'dist-b.js'],
      [
        {
          version: '1.2.0',
          uri: 'https://registry.npmjs.org/axios/-/axios-1.2.0.tgz',
          latest: true,
          files: new Map([
            ['dist-a.js', Buffer.from('baseline artifact')],
            ['dist-b.js', Buffer.from('baseline artifact with content')],
          ]),
        },
        {
          version: '1.1.0',
          uri: 'https://registry.npmjs.org/axios/-/axios-1.1.0.tgz',
          latest: false,
          files: new Map([
            ['dist-a.js', Buffer.from('older baseline artifact')],
            ['dist-b.js', Buffer.from('older baseline artifact with content')],
          ]),
        },
      ],
    );

    assert.equal(report.metric, 'gzip');
    assert.equal(report.packageName, 'axios');
    assert.equal(report.baseline.version, '1.2.0');
    assert.equal(report.baseline.uri, 'https://registry.npmjs.org/axios/-/axios-1.2.0.tgz');
    assert.equal(report.localRoot, localRoot);
    assert.deepEqual(report.files.map((file) => file.path), ['dist-a.js', 'dist-b.js']);
    assert.deepEqual(report.history.map((release) => release.version), ['1.2.0', '1.1.0']);
    assert.equal(report.history[1].complete, true);

    for (const file of report.files) {
      assert.equal(file.deltaBytes, file.currentBytes - file.baselineBytes);
      assert.equal(file.deltaPercent, Number(((file.deltaBytes / file.baselineBytes) * 100).toFixed(2)));
    }

    assert.equal(
      report.totals.baselineBytes,
      report.files.reduce((total, file) => total + file.baselineBytes, 0),
    );
    assert.equal(
      report.totals.currentBytes,
      report.files.reduce((total, file) => total + file.currentBytes, 0),
    );
    assert.equal(report.totals.deltaBytes, report.totals.currentBytes - report.totals.baselineBytes);
    assert.equal(
      report.totals.deltaPercent,
      Number(((report.totals.deltaBytes / report.totals.baselineBytes) * 100).toFixed(2)),
    );
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});

test('buildComparisonReport handles empty file contents as gzip inputs', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    await writeFile(path.join(localRoot, 'empty.js'), '');

    const report = await buildComparisonReport(
      localRoot,
      'axios',
      ['empty.js'],
      [
        {
          version: '1.0.0',
          uri: 'https://registry.npmjs.org/axios/-/axios-1.0.0.tgz',
          latest: true,
          files: new Map([['empty.js', Buffer.alloc(0)]]),
        },
      ],
    );

    assert.ok(report.files[0].baselineBytes > 0);
    assert.equal(report.files[0].deltaPercent, 0);
    assert.equal(report.totals.deltaPercent, 0);
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});

test('buildComparisonReport fails when baseline file is missing', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    await writeFile(path.join(localRoot, 'dist-a.js'), 'current artifact');

    await assert.rejects(
      buildComparisonReport(localRoot, 'axios', ['dist-a.js'], [
        {
          version: '1.0.0',
          uri: 'https://registry.npmjs.org/axios/-/axios-1.0.0.tgz',
          latest: true,
          files: new Map(),
        },
      ]),
      /Baseline file not found in latest release 1\.0\.0/,
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
        'axios',
        ['dist-a.js'],
        [
          {
            version: '1.0.0',
            uri: 'https://registry.npmjs.org/axios/-/axios-1.0.0.tgz',
            latest: true,
            files: new Map([['dist-a.js', Buffer.from('baseline artifact')]]),
          },
        ],
      ),
      /Local file not found: dist-a\.js/,
    );
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});

test('buildComparisonReport records missing previous-release files without failing', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    await writeFile(path.join(localRoot, 'dist-a.js'), 'current artifact');
    await writeFile(path.join(localRoot, 'dist-b.js'), 'current artifact');

    const report = await buildComparisonReport(
      localRoot,
      'axios',
      ['dist-a.js', 'dist-b.js'],
      [
        {
          version: '1.2.0',
          uri: 'https://registry.npmjs.org/axios/-/axios-1.2.0.tgz',
          latest: true,
          files: new Map([
            ['dist-a.js', Buffer.from('latest a')],
            ['dist-b.js', Buffer.from('latest b')],
          ]),
        },
        {
          version: '1.1.0',
          uri: 'https://registry.npmjs.org/axios/-/axios-1.1.0.tgz',
          latest: false,
          files: new Map([['dist-a.js', Buffer.from('old a')]]),
        },
      ],
    );

    assert.equal(report.history[1].complete, false);
    assert.deepEqual(report.history[1].missingFiles, ['dist-b.js']);
    assert.equal(report.history[1].totals, null);
    assert.deepEqual(report.history[1].files.map((file) => file.path), ['dist-a.js']);
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});
