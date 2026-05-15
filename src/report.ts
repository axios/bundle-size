import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveInsideRoot } from "./paths";
import type { ComparisonReport } from "./types";

export async function writeComparisonReport(
  localRoot: string,
  outputFile: string,
  report: ComparisonReport,
): Promise<string> {
  const outputPath = resolveInsideRoot(localRoot, outputFile);
  const outputDirectory = path.dirname(outputPath);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return outputPath;
}
