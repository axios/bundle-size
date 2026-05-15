import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { constants, gzip } from "node:zlib";
import { resolveInsideRoot } from "./paths";
import type { ComparisonFileResult, ComparisonReport } from "./types";

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
  tarballUri: string,
  filePaths: string[],
  baselineFiles: Map<string, Buffer>,
): Promise<ComparisonReport> {
  const files: ComparisonFileResult[] = [];

  for (const filePath of filePaths) {
    const baselineContent = baselineFiles.get(filePath);

    if (!baselineContent) {
      throw new Error(`Baseline file not found in tarball: ${filePath}`);
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

  return {
    metric: "gzip",
    baseline: {
      uri: tarballUri,
    },
    localRoot,
    files,
    totals: {
      baselineBytes,
      currentBytes,
      deltaBytes: currentBytes - baselineBytes,
      deltaPercent: percentDelta(currentBytes, baselineBytes),
    },
  };
}
