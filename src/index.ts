import path from "node:path";
import { pathToFileURL } from "node:url";
import { run } from "@/action";

export { run } from "@/action";
export { buildComparisonReport } from "@/comparison";
export { renderBundleSizeComment, statusEmoji } from "@/comment";
export { parseFilePaths } from "@/paths";
export { getPullRequestNumberFromEvent, upsertPullRequestComment } from "@/pr-comment";
export { createTarballFileMap, extractTarGzEntries } from "@/tarball";

const entrypoint = process.argv[1];

if (
  entrypoint &&
  (import.meta.url === pathToFileURL(entrypoint).href ||
    path.normalize(entrypoint).endsWith(path.join("dist", "index.js")))
) {
  void run();
}
