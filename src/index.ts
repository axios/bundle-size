import * as core from "@actions/core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { constants, gunzip, gzip } from "node:zlib";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const TAR_BLOCK_SIZE = 512;

export interface ComparisonFileResult {
  path: string;
  baselineBytes: number;
  currentBytes: number;
  deltaBytes: number;
  deltaPercent: number | null;
}

export interface ComparisonReport {
  metric: "gzip";
  baseline: {
    uri: string;
  };
  localRoot: string;
  files: ComparisonFileResult[];
  totals: {
    baselineBytes: number;
    currentBytes: number;
    deltaBytes: number;
    deltaPercent: number | null;
  };
}

interface ActionConfig {
  localRoot: string;
  tarballUri: string;
  filePaths: string[];
  outputFile: string;
}

interface TarEntry {
  path: string;
  content: Buffer;
}

function normalizeConfiguredPath(filePath: string): string {
  const normalized = path.posix.normalize(filePath.trim().replace(/\\/g, "/"));

  if (!normalized || normalized === ".") {
    throw new Error("Configured file paths must not be empty.");
  }

  if (
    normalized.startsWith("/") ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(
      `Configured file path must be relative and stay inside the project: ${filePath}`,
    );
  }

  return normalized;
}

export function parseFilePaths(input: string): string[] {
  const filePaths = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeConfiguredPath);

  if (filePaths.length === 0) {
    throw new Error(
      "At least one file path must be provided via the files input.",
    );
  }

  return [...new Set(filePaths)];
}

function validateTarballUri(uri: string): string {
  const trimmedUri = uri.trim();

  if (!trimmedUri) {
    throw new Error("The tarball-uri input is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedUri);
  } catch {
    throw new Error(`Invalid tarball URI: ${uri}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported tarball URI protocol: ${parsed.protocol}`);
  }

  return trimmedUri;
}

function resolveInsideRoot(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const relativeFromRoot = path.relative(resolvedRoot, resolvedPath);

  if (
    relativeFromRoot === "" ||
    relativeFromRoot.startsWith("..") ||
    path.isAbsolute(relativeFromRoot)
  ) {
    throw new Error(`Path must stay inside the project root: ${relativePath}`);
  }

  return resolvedPath;
}

function getConfig(): ActionConfig {
  const localRoot = path.resolve(
    core.getInput("path", { required: false }) || ".",
  );
  const tarballUri = validateTarballUri(
    core.getInput("tarball-uri", { required: true }),
  );
  const filesInput = core
    .getMultilineInput("files", { required: true })
    .join("\n");
  const outputFile = normalizeConfiguredPath(
    core.getInput("output-file", { required: false }) ||
      "bundle-size-comparison.json",
  );

  return {
    localRoot,
    tarballUri,
    filePaths: parseFilePaths(filesInput),
    outputFile,
  };
}

async function downloadTarball(uri: string): Promise<Buffer> {
  let response: Response;

  try {
    response = await fetch(uri);
  } catch (error) {
    throw new Error(
      `Failed to download tarball URI ${uri}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to download tarball URI ${uri}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

function readTarString(block: Buffer, start: number, length: number): string {
  const raw = block.subarray(start, start + length);
  const nullIndex = raw.indexOf(0);
  const value = nullIndex === -1 ? raw : raw.subarray(0, nullIndex);

  return value.toString("utf8").trim();
}

function readTarSize(block: Buffer): number {
  const rawSize = readTarString(block, 124, 12).replace(/\0/g, "").trim();
  return rawSize ? Number.parseInt(rawSize, 8) : 0;
}

function isEmptyTarBlock(block: Buffer): boolean {
  return block.every((byte) => byte === 0);
}

function normalizeTarEntryPath(entryPath: string): string {
  return path.posix
    .normalize(entryPath.replace(/\\/g, "/"))
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

export async function extractTarGzEntries(
  archive: Buffer,
): Promise<TarEntry[]> {
  const tar = await gunzipAsync(archive);
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + TAR_BLOCK_SIZE <= tar.length) {
    const header = tar.subarray(offset, offset + TAR_BLOCK_SIZE);

    if (isEmptyTarBlock(header)) {
      break;
    }

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const entryPath = normalizeTarEntryPath(
      prefix ? `${prefix}/${name}` : name,
    );
    const size = readTarSize(header);
    const type = readTarString(header, 156, 1);
    const contentStart = offset + TAR_BLOCK_SIZE;
    const contentEnd = contentStart + size;

    if (contentEnd > tar.length) {
      throw new Error(`Tarball entry is truncated: ${entryPath}`);
    }

    if (entryPath && (type === "" || type === "0")) {
      entries.push({
        path: entryPath,
        content: Buffer.from(tar.subarray(contentStart, contentEnd)),
      });
    }

    offset = contentStart + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
  }

  if (entries.length === 0) {
    throw new Error("Tarball did not contain any regular files.");
  }

  return entries;
}

function getSingleTopLevelDirectory(paths: string[]): string | null {
  const firstSegments = paths
    .map((entryPath) => entryPath.split("/")[0])
    .filter(Boolean);
  const [firstSegment] = firstSegments;

  if (
    !firstSegment ||
    firstSegments.some((segment) => segment !== firstSegment)
  ) {
    return null;
  }

  return paths.every((entryPath) => entryPath.includes("/"))
    ? firstSegment
    : null;
}

export function createTarballFileMap(entries: TarEntry[]): Map<string, Buffer> {
  const fileMap = new Map<string, Buffer>();
  const topLevelDirectory = getSingleTopLevelDirectory(
    entries.map((entry) => entry.path),
  );

  for (const entry of entries) {
    fileMap.set(entry.path, entry.content);

    if (topLevelDirectory && entry.path.startsWith(`${topLevelDirectory}/`)) {
      fileMap.set(
        entry.path.slice(topLevelDirectory.length + 1),
        entry.content,
      );
    }
  }

  return fileMap;
}

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

async function writeComparisonReport(
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
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

if (require.main === module) {
  void run();
}
