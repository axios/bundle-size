import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUNDLE_SIZE_COMMENT_MARKER,
  renderBundleSizeComment,
  statusEmoji,
} from '../lib/comment.js';

function createReport() {
  return {
    metric: 'gzip',
    baseline: { uri: 'https://example.com/archive.tgz' },
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
  };
}

test('renderBundleSizeComment renders files, totals, marker, sizes, and statuses', () => {
  const markdown = renderBundleSizeComment(createReport());

  assert.match(markdown, new RegExp(BUNDLE_SIZE_COMMENT_MARKER));
  assert.match(markdown, /\| File \| Baseline gzip \| Current gzip \| Difference \| Status \|/);
  assert.match(markdown, /\| `dist\/a\.js` \| 1\.0 KiB \| 1\.0 KiB \| 30 B \(\+2\.93%\) \| 🔵 \|/);
  assert.match(markdown, /\| `dist\/b\.js` \| 2\.0 KiB \| 2\.0 KiB \| -38 B \(-1\.86%\) \| 🟢 \|/);
  assert.match(markdown, /\| \*\*Total\*\* \| \*\*3\.0 KiB\*\* \| \*\*3\.0 KiB\*\* \| \*\*-8 B \(-0\.26%\)\*\* \| \*\*🟢\*\* \|/);
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
