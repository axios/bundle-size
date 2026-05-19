import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'vitest';

import { writeComparisonReport, writeMarkdownReport } from '@/report';
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
        baselineBytes: 10,
        currentBytes: 12,
        deltaBytes: 2,
        deltaPercent: 20,
      },
    ],
    totals: {
      baselineBytes: 10,
      currentBytes: 12,
      deltaBytes: 2,
      deltaPercent: 20,
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
            baselineBytes: 10,
            currentBytes: 12,
            deltaBytes: 2,
            deltaPercent: 20,
          },
        ],
        totals: {
          baselineBytes: 10,
          currentBytes: 12,
          deltaBytes: 2,
          deltaPercent: 20,
        },
      },
      {
        version: '1.1.0',
        uri: 'https://registry.npmjs.org/axios/-/axios-1.1.0.tgz',
        latest: false,
        complete: false,
        missingFiles: ['dist/a.js'],
        files: [],
        totals: null,
      },
    ],
  };
}

test('writeComparisonReport writes pretty JSON with trailing newline', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    const report = createReport();
    const outputPath = await writeComparisonReport(localRoot, 'reports/comparison.json', report);

    assert.equal(outputPath, path.join(localRoot, 'reports/comparison.json'));
    assert.equal(await readFile(outputPath, 'utf8'), `${JSON.stringify(report, null, 2)}\n`);

    const writtenReport = JSON.parse(await readFile(outputPath, 'utf8')) as ComparisonReport;
    assert.equal(writtenReport.packageName, 'axios');
    assert.equal(writtenReport.baseline.version, '1.2.0');
    assert.equal(writtenReport.history[1].complete, false);
    assert.deepEqual(writtenReport.history[1].missingFiles, ['dist/a.js']);
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});

test('writeComparisonReport preserves release stream metadata', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    const report = createReport();
    report.releaseStream = 1;
    const outputPath = await writeComparisonReport(localRoot, 'comparison.json', report);

    const writtenReport = JSON.parse(await readFile(outputPath, 'utf8')) as ComparisonReport;
    assert.equal(writtenReport.releaseStream, 1);
    assert.equal(writtenReport.baseline.version, '1.2.0');
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});

test('writeComparisonReport rejects unsafe output paths', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    await assert.rejects(
      writeComparisonReport(localRoot, '../comparison.json', createReport()),
      /stay inside/,
    );
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});

test('writeMarkdownReport writes Markdown with trailing newline', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    const outputPath = await writeMarkdownReport(localRoot, 'reports/comparison.md', '## Report');

    assert.equal(outputPath, path.join(localRoot, 'reports/comparison.md'));
    assert.equal(await readFile(outputPath, 'utf8'), '## Report\n');
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});

test('writeMarkdownReport rejects unsafe output paths', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    await assert.rejects(
      writeMarkdownReport(localRoot, '../comparison.md', '## Report'),
      /stay inside/,
    );
  } finally {
    await rm(localRoot, { force: true, recursive: true });
  }
});
