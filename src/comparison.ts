import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { constants, gzip } from "node:zlib";
import { resolveInsideRoot } from "@/paths";
import type {
  BaselineReleaseArchive,
  ComparisonFileResult,
  ComparisonReport,
  ComparisonTotals,
  ReleaseComparisonResult,
} from "@/types";

const gzipAsync = promisify(gzip);

async function gzipSize(content: Buffer): Promise<number> {
  const compressed = await gzipAsync(content, {
    level: constants.Z_BEST_COMPRESSION,
  });

  return compressed.length;
}

function percentDelta(
  currentBytes: number,
  baselineBytes: number,
): number | null {
  if (baselineBytes === 0) {
    return null;
  }

  return Number(
    (((currentBytes - baselineBytes) / baselineBytes) * 100).toFixed(2),
  );
}

export async function buildComparisonReport(
  localRoot: string,
  packageName: string,
  filePaths: string[],
  releases: BaselineReleaseArchive[],
  releaseStream?: number,
): Promise<ComparisonReport> {
  const [latestRelease] = releases;

  if (!latestRelease) {
    throw new Error("At least one npm release baseline is required.");
  }

  const history: ReleaseComparisonResult[] = [];

  for (const release of releases) {
    history.push(
      await buildReleaseComparison(localRoot, filePaths, release, release.latest),
    );
  }

  const [latestComparison] = history;

  if (!latestComparison.totals) {
    throw new Error(`Primary release comparison is incomplete: ${latestRelease.version}`);
  }

  return {
    metric: "gzip",
    packageName,
    releaseStream,
    baseline: {
      version: latestRelease.version,
      uri: latestRelease.uri,
    },
    localRoot,
    files: latestComparison.files,
    totals: latestComparison.totals,
    history,
  };
}

async function buildReleaseComparison(
  localRoot: string,
  filePaths: string[],
  release: BaselineReleaseArchive,
  strictMissingBaseline: boolean,
): Promise<ReleaseComparisonResult> {
  const files: ComparisonFileResult[] = [];
  const missingFiles: string[] = [];

  for (const filePath of filePaths) {
    const baselineContent = release.files.get(filePath);

    if (!baselineContent) {
      if (strictMissingBaseline) {
        throw new Error(
          `Baseline file not found in primary release ${release.version}: ${filePath}`,
        );
      }

      missingFiles.push(filePath);
      continue;
    }

    const localPath = resolveInsideRoot(localRoot, filePath);
    let currentContent: Buffer;

    try {
      currentContent = await readFile(localPath);
    } catch (error) {
      throw new Error(
        `Local file not found: ${filePath} (${error instanceof Error ? error.message : String(error)})`,
      );
    }

    const baselineBytes = await gzipSize(baselineContent);
    const currentBytes = await gzipSize(currentContent);
    const deltaBytes = currentBytes - baselineBytes;

    files.push({
      path: filePath,
      baselineBytes,
      currentBytes,
      deltaBytes,
      deltaPercent: percentDelta(currentBytes, baselineBytes),
    });
  }

  const baselineBytes = files.reduce(
    (total, file) => total + file.baselineBytes,
    0,
  );
  const currentBytes = files.reduce(
    (total, file) => total + file.currentBytes,
    0,
  );
  const totals: ComparisonTotals | null = missingFiles.length > 0
    ? null
    : {
        baselineBytes,
        currentBytes,
        deltaBytes: currentBytes - baselineBytes,
        deltaPercent: percentDelta(currentBytes, baselineBytes),
      };

  return {
    version: release.version,
    uri: release.uri,
    latest: release.latest,
    complete: missingFiles.length === 0,
    missingFiles,
    files,
    totals,
  };
}
