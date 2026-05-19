import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  BUNDLE_SIZE_COMMENT_MARKER,
  renderBundleSizeComment,
  statusEmoji,
} from '@/comment';
import type { ComparisonReport } from '@/types';

function createReport(): ComparisonReport {
  return {
    metric: 'gzip',
    packageName: 'axios',
    baseline: {
      version: '1.2.0',
      uri: 'https://registry.npmjs.org/axios/-/axios-1.2.0.tgz',
    },
    localRoot: '/tmp/project',
    files: [
      {
        path: 'dist/a.js',
        baselineBytes: 1024,
        currentBytes: 1054,
        deltaBytes: 30,
        deltaPercent: 2.93,
      },
      {
        path: 'dist/b.js',
        baselineBytes: 2048,
        currentBytes: 2010,
        deltaBytes: -38,
        deltaPercent: -1.86,
      },
    ],
    totals: {
      baselineBytes: 3072,
      currentBytes: 3064,
      deltaBytes: -8,
      deltaPercent: -0.26,
    },
    history: [
      {
        version: '1.2.0',
        uri: 'https://registry.npmjs.org/axios/-/axios-1.2.0.tgz',
        latest: true,
        complete: true,
        missingFiles: [],
        files: [
          {
            path: 'dist/a.js',
            baselineBytes: 1024,
            currentBytes: 1054,
            deltaBytes: 30,
            deltaPercent: 2.93,
          },
          {
            path: 'dist/b.js',
            baselineBytes: 2048,
            currentBytes: 2010,
            deltaBytes: -38,
            deltaPercent: -1.86,
          },
        ],
        totals: {
          baselineBytes: 3072,
          currentBytes: 3064,
          deltaBytes: -8,
          deltaPercent: -0.26,
        },
      },
      {
        version: '1.1.0',
        uri: 'https://registry.npmjs.org/axios/-/axios-1.1.0.tgz',
        latest: false,
        complete: true,
        missingFiles: [],
        files: [],
        totals: {
          baselineBytes: 3000,
          currentBytes: 3064,
          deltaBytes: 64,
          deltaPercent: 2.13,
        },
      },
    ],
  };
}

test('renderBundleSizeComment renders files, totals, marker, sizes, and statuses', () => {
  const markdown = renderBundleSizeComment(createReport());

  assert.match(markdown, new RegExp(BUNDLE_SIZE_COMMENT_MARKER));
  assert.match(markdown, /latest npm release `1\.2\.0` for `axios`/);
  assert.match(markdown, /\| File \| Baseline gzip \| Current gzip \| Difference \| Status \|/);
  assert.match(markdown, /\| `dist\/a\.js` \| 1\.0 KiB \| 1\.0 KiB \| 30 B \(\+2\.93%\) \| 🔵 \|/);
  assert.match(markdown, /\| `dist\/b\.js` \| 2\.0 KiB \| 2\.0 KiB \| -38 B \(-1\.86%\) \| 🟢 \|/);
  assert.match(markdown, /\| \*\*Total\*\* \| \*\*3\.0 KiB\*\* \| \*\*3\.0 KiB\*\* \| \*\*-8 B \(-0\.26%\)\*\* \| \*\*🟢\*\* \|/);
});

test('renderBundleSizeComment preserves the documented Markdown contract', () => {
  assert.equal(
    renderBundleSizeComment(createReport()),
    [
      BUNDLE_SIZE_COMMENT_MARKER,
      '',
      '## Bundle Size Report',
      '',
      'Compared current build against latest npm release `1.2.0` for `axios`.',
      '',
      '| File | Baseline gzip | Current gzip | Difference | Status |',
      '|---|---:|---:|---:|:---:|',
      '| `dist/a.js` | 1.0 KiB | 1.0 KiB | 30 B (+2.93%) | 🔵 |',
      '| `dist/b.js` | 2.0 KiB | 2.0 KiB | -38 B (-1.86%) | 🟢 |',
      '| **Total** | **3.0 KiB** | **3.0 KiB** | **-8 B (-0.26%)** | **🟢** |',
      '',
      '<details>',
      '<summary>Historical comparison: latest + 10 previous npm releases</summary>',
      '',
      '| Release | Baseline gzip | Current gzip | Difference | Status |',
      '|---|---:|---:|---:|:---:|',
      '| `1.2.0` latest | 3.0 KiB | 3.0 KiB | -8 B (-0.26%) | 🟢 |',
      '| `1.1.0` | 2.9 KiB | 3.0 KiB | 64 B (+2.13%) | 🔵 |',
      '',
      '</details>',
    ].join('\n'),
  );
});

test('renderBundleSizeComment renders historical release summary in details block', () => {
  const markdown = renderBundleSizeComment(createReport());

  assert.match(markdown, /<details>/);
  assert.match(markdown, /<summary>Historical comparison: latest \+ 10 previous npm releases<\/summary>/);
  assert.match(markdown, /\| Release \| Baseline gzip \| Current gzip \| Difference \| Status \|/);
  assert.match(markdown, /\| `1\.2\.0` latest \| 3\.0 KiB \| 3\.0 KiB \| -8 B \(-0\.26%\) \| 🟢 \|/);
  assert.match(markdown, /\| `1\.1\.0` \| 2\.9 KiB \| 3\.0 KiB \| 64 B \(\+2\.13%\) \| 🔵 \|/);
  assert.match(markdown, /<\/details>/);
});

test('renderBundleSizeComment describes release stream histories', () => {
  const report = createReport();
  report.releaseStream = 1;

  const markdown = renderBundleSizeComment(report);

  assert.match(markdown, /against `1\.x` release stream baseline `1\.2\.0` for `axios`/);
  assert.match(markdown, /<summary>Historical comparison: 1\.x release stream baselines<\/summary>/);
  assert.doesNotMatch(markdown, /latest \+ 10 previous npm releases/);
});

test('renderBundleSizeComment renders incomplete historical releases', () => {
  const report = createReport();
  report.history = [
    report.history[0],
    {
      version: '1.0.0',
      uri: 'https://registry.npmjs.org/axios/-/axios-1.0.0.tgz',
      latest: false,
      complete: false,
      missingFiles: ['dist/b.js'],
      files: [],
      totals: null,
    },
  ];

  const markdown = renderBundleSizeComment(report);

  assert.match(markdown, /\| `1\.0\.0` \| n\/a \| n\/a \| Incomplete: missing `dist\/b\.js` \| ⚪ \|/);
});

test('renderBundleSizeComment handles no previous releases', () => {
  const report = createReport();
  report.history = [report.history[0]];

  const markdown = renderBundleSizeComment(report);

  assert.match(markdown, /\| `1\.2\.0` latest \| 3\.0 KiB \| 3\.0 KiB \| -8 B \(-0\.26%\) \| 🟢 \|/);
  assert.doesNotMatch(markdown, /`1\.1\.0`/);
});

test('renderBundleSizeComment keeps special file path characters inside the table cell', () => {
  const report = createReport();
  report.files = [
    {
      path: 'dist/`asset|name`\\file.js',
      baselineBytes: 10,
      currentBytes: 12,
      deltaBytes: 2,
      deltaPercent: 20,
    },
  ];

  const markdown = renderBundleSizeComment(report);

  assert.match(markdown, /\| ``dist\/`asset\\\|name`\\\\file\.js`` \| 10 B \| 12 B \| 2 B \(\+20\.00%\) \| 🔴 \|/);
});

test('statusEmoji maps percent deltas to the fixed color scale', () => {
  assert.equal(statusEmoji(null), '⚪');
  assert.equal(statusEmoji(-5), '🟢');
  assert.equal(statusEmoji(1), '🟢');
  assert.equal(statusEmoji(1.01), '🔵');
  assert.equal(statusEmoji(3), '🔵');
  assert.equal(statusEmoji(3.01), '🟡');
  assert.equal(statusEmoji(6), '🟡');
  assert.equal(statusEmoji(6.01), '🟠');
  assert.equal(statusEmoji(9), '🟠');
  assert.equal(statusEmoji(9.01), '🔴');
});

test('renderBundleSizeComment preserves exact bytes in the input report', () => {
  const report = createReport();

  renderBundleSizeComment(report);

  assert.equal(report.files[0].baselineBytes, 1024);
  assert.equal(report.files[0].currentBytes, 1054);
  assert.equal(report.totals.deltaBytes, -8);
});
