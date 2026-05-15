import { run } from "./action";

export { run } from "./action";
export { buildComparisonReport } from "./comparison";
export { parseFilePaths } from "./paths";
export { createTarballFileMap, extractTarGzEntries } from "./tarball";

if (require.main === module) {
  void run();
}
