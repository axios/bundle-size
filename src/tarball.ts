import path from "node:path";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";
import type { TarEntry } from "./types";

const gunzipAsync = promisify(gunzip);
const TAR_BLOCK_SIZE = 512;

export async function downloadTarball(uri: string): Promise<Buffer> {
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

function readTarSize(block: Buffer, entryPath: string): number {
  const rawSize = readTarString(block, 124, 12).replace(/\0/g, "").trim();

  if (!rawSize) {
    return 0;
  }

  if (!/^[0-7]+$/.test(rawSize)) {
    throw new Error(`Tarball entry has invalid size field: ${entryPath}`);
  }

  const size = Number.parseInt(rawSize, 8);

  if (!Number.isSafeInteger(size)) {
    throw new Error(`Tarball entry size is too large: ${entryPath}`);
  }

  return size;
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
  let tar: Buffer;

  try {
    tar = await gunzipAsync(archive);
  } catch (error) {
    throw new Error(
      `Tarball is not a valid .tar.gz archive: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

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
    const size = readTarSize(header, entryPath);
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
