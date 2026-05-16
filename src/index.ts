import { run } from "./action";

export { run } from "./action";
export { buildComparisonReport } from "./comparison";
export { renderBundleSizeComment, statusEmoji } from "./comment";
export { parseFilePaths } from "./paths";
export { getPullRequestNumberFromEvent, upsertPullRequestComment } from "./pr-comment";
export { createTarballFileMap, extractTarGzEntries } from "./tarball";

if (require.main === module) {
  void run();
}
