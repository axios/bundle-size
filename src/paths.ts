import path from "node:path";

export function normalizeConfiguredPath(filePath: string): string {
  const trimmedPath = filePath.trim();
  const slashNormalizedPath = trimmedPath.replace(/\\/g, "/");

  if (/^[A-Za-z]:\//.test(slashNormalizedPath) || slashNormalizedPath.startsWith("//")) {
    throw new Error(
      `Configured file path must be relative and stay inside the project: ${filePath}`,
    );
  }

  const normalized = path.posix.normalize(slashNormalizedPath);

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

export function resolveInsideRoot(root: string, relativePath: string): string {
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
