import * as core from "@actions/core";
import { renderBundleSizeComment } from "@/comment";
import { buildComparisonReport } from "@/comparison";
import { getConfig } from "@/config";
import { resolveNpmReleaseBaselines } from "@/npm";
import { writeComparisonReport, writeMarkdownReport } from "@/report";
import {
  createTarballFileMap,
  downloadTarball,
  extractTarGzEntries,
} from "@/tarball";

export async function run(): Promise<void> {
  try {
    const config = getConfig();

    core.info(`Local project root: ${config.localRoot}`);
    core.info(`Npm package baseline: ${config.packageName}`);
    if (config.releaseStream !== undefined) {
      core.info(`Npm release stream baseline: ${config.releaseStream}.x`);
    }
    core.info(`Comparing ${config.filePaths.length} file(s) using gzip size.`);

    const releases = await resolveNpmReleaseBaselines(
      config.packageName,
      config.releaseStream,
    );
    core.info(`Resolved ${releases.length} npm release baseline(s).`);

    const releaseArchives = [];

    for (const release of releases) {
      core.info(`Downloading ${config.packageName}@${release.version}: ${release.uri}`);
      const archive = await downloadTarball(release.uri);

      releaseArchives.push({
        ...release,
        files: createTarballFileMap(await extractTarGzEntries(archive)),
      });
    }

    const report = await buildComparisonReport(
      config.localRoot,
      config.packageName,
      config.filePaths,
      releaseArchives,
      config.releaseStream,
    );
    const outputPath = await writeComparisonReport(
      config.localRoot,
      config.outputFile,
      report,
    );
    const markdownOutputPath = await writeMarkdownReport(
      config.localRoot,
      config.markdownOutputFile,
      renderBundleSizeComment(report),
    );

    core.info(`Wrote bundle size comparison file: ${outputPath}`);
    core.info(`Wrote bundle size Markdown file: ${markdownOutputPath}`);
    core.setOutput("comparison-file", outputPath);
    core.setOutput("markdown-file", markdownOutputPath);
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
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}
