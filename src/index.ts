import { join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { run } from "@/action";

export { run } from "@/action";
export { buildComparisonReport } from "@/comparison";
export { renderBundleSizeComment, statusEmoji } from "@/comment";
export { resolveNpmReleaseBaselines } from "@/npm";
export { parseFilePaths } from "@/paths";
export { getPullRequestNumberFromEvent, upsertPullRequestComment } from "@/pr-comment";
export { createTarballFileMap, extractTarGzEntries } from "@/tarball";

const entrypoint = process.argv[1];

export function shouldRunEntrypoint(
  entrypointPath = entrypoint,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    (environment.GITHUB_ACTIONS === "true" && environment.INPUT_FILES !== undefined) ||
      (entrypointPath &&
        (import.meta.url === pathToFileURL(entrypointPath).href ||
          normalize(entrypointPath).endsWith(join("dist", "index.js")))),
  );
}

if (shouldRunEntrypoint()) {
  void run();
}
