import * as core from "@actions/core";
import path from "node:path";
import { normalizeConfiguredPath, parseFilePaths } from "./paths";
import type { ActionConfig } from "./types";

export function validateTarballUri(uri: string): string {
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

export function getConfig(): ActionConfig {
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
  const commentPrInput = core.getInput("comment-pr", { required: false });
  const commentPr = commentPrInput
    ? core.getBooleanInput("comment-pr", { required: false })
    : false;
  const githubToken = core.getInput("github-token", { required: false });

  if (commentPr && !githubToken) {
    throw new Error("The github-token input is required when comment-pr is enabled.");
  }

  return {
    localRoot,
    tarballUri,
    filePaths: parseFilePaths(filesInput),
    outputFile,
    commentPr,
    githubToken,
  };
}
