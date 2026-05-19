import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveInsideRoot } from "@/paths";
import type { ComparisonReport } from "@/types";

async function writeReportFile(
  localRoot: string,
  outputFile: string,
  content: string,
): Promise<string> {
  const outputPath = resolveInsideRoot(localRoot, outputFile);
  const outputDirectory = path.dirname(outputPath);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${content}\n`, "utf8");

  return outputPath;
}

export async function writeComparisonReport(
  localRoot: string,
  outputFile: string,
  report: ComparisonReport,
): Promise<string> {
  return writeReportFile(localRoot, outputFile, JSON.stringify(report, null, 2));
}

export async function writeMarkdownReport(
  localRoot: string,
  outputFile: string,
  markdown: string,
): Promise<string> {
  return writeReportFile(localRoot, outputFile, markdown);
}
