import * as core from "@actions/core";
import { renderBundleSizeComment } from "./comment.js";
import { buildComparisonReport } from "./comparison.js";
import { getConfig } from "./config.js";
import { upsertPullRequestComment } from "./pr-comment.js";
import { writeComparisonReport } from "./report.js";
import {
  createTarballFileMap,
  downloadTarball,
  extractTarGzEntries,
} from "./tarball.js";

export async function run(): Promise<void> {
  try {
    const config = getConfig();

    core.info(`Local project root: ${config.localRoot}`);
    core.info(`Baseline tarball URI: ${config.tarballUri}`);
    core.info(`Comparing ${config.filePaths.length} file(s) using gzip size.`);

    const archive = await downloadTarball(config.tarballUri);
    const baselineFiles = createTarballFileMap(
      await extractTarGzEntries(archive),
    );
    const report = await buildComparisonReport(
      config.localRoot,
      config.tarballUri,
      config.filePaths,
      baselineFiles,
    );
    const outputPath = await writeComparisonReport(
      config.localRoot,
      config.outputFile,
      report,
    );

    core.info(`Wrote bundle size comparison file: ${outputPath}`);
    core.setOutput("comparison-file", outputPath);
    core.setOutput("size", String(report.totals.currentBytes));
    core.setOutput(
      "total-current-gzip-size",
      String(report.totals.currentBytes),
    );
    core.setOutput(
      "total-baseline-gzip-size",
      String(report.totals.baselineBytes),
    );
    core.setOutput("total-delta-gzip-size", String(report.totals.deltaBytes));

    if (config.commentPr) {
      await upsertPullRequestComment(
        config.githubToken,
        renderBundleSizeComment(report),
      );
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}
