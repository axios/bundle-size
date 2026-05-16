import { pathToFileURL } from "node:url";
import { run } from "./action.js";

export { run } from "./action.js";
export { buildComparisonReport } from "./comparison.js";
export { renderBundleSizeComment, statusEmoji } from "./comment.js";
export { parseFilePaths } from "./paths.js";
export { getPullRequestNumberFromEvent, upsertPullRequestComment } from "./pr-comment.js";
export { createTarballFileMap, extractTarGzEntries } from "./tarball.js";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void run();
}
