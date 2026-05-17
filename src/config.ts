import * as core from "@actions/core";
import path from "node:path";
import { normalizeConfiguredPath, parseFilePaths } from "@/paths";
import type { ActionConfig } from "@/types";

export function validateNpmPackageName(packageName: string): string {
  const trimmedPackageName = packageName.trim();

  if (!trimmedPackageName) {
    throw new Error("The package-name input is required.");
  }

  if (/\s/.test(trimmedPackageName) || trimmedPackageName.includes(":")) {
    throw new Error(`Invalid npm package name: ${packageName}`);
  }

  if (trimmedPackageName.startsWith("@")) {
    const segments = trimmedPackageName.split("/");

    if (segments.length !== 2 || !segments[0].slice(1) || !segments[1]) {
      throw new Error(`Invalid npm package name: ${packageName}`);
    }

    return trimmedPackageName;
  }

  if (trimmedPackageName.includes("/")) {
    throw new Error(`Invalid npm package name: ${packageName}`);
  }

  return trimmedPackageName;
}

export function getConfig(): ActionConfig {
  const localRoot = path.resolve(
    core.getInput("path", { required: false }) || ".",
  );
  const packageName = validateNpmPackageName(
    core.getInput("package-name", { required: true }),
  );
  const filesInput = core
    .getMultilineInput("files", { required: true })
    .join("\n");
  const outputFile = normalizeConfiguredPath(
    core.getInput("output-file", { required: false }) ||
      "bundle-size-comparison.json",
  );
  const commentPr = core.getBooleanInput("comment-pr", { required: false });
  const githubToken = core.getInput("github-token", { required: false });

  if (commentPr && !githubToken) {
    throw new Error("The github-token input is required when comment-pr is enabled.");
  }

  return {
    localRoot,
    packageName,
    filePaths: parseFilePaths(filesInput),
    outputFile,
    commentPr,
    githubToken,
  };
}
