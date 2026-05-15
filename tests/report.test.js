const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { writeComparisonReport } = require('../lib/report.js');

function createReport() {
  return {
    metric: 'gzip',
    baseline: { uri: 'https://example.com/archive.tgz' },
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
  };
}

test('writeComparisonReport writes pretty JSON with trailing newline', async () => {
  const localRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-'));

  try {
    const report = createReport();
    const outputPath = await writeComparisonReport(localRoot, 'reports/comparison.json', report);

    assert.equal(outputPath, path.join(localRoot, 'reports/comparison.json'));
    assert.equal(await readFile(outputPath, 'utf8'), `${JSON.stringify(report, null, 2)}\n`);
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
