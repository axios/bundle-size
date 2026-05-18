export interface ComparisonFileResult {
  path: string;
  baselineBytes: number;
  currentBytes: number;
  deltaBytes: number;
  deltaPercent: number | null;
}

export interface ComparisonTotals {
  baselineBytes: number;
  currentBytes: number;
  deltaBytes: number;
  deltaPercent: number | null;
}

export interface ReleaseComparisonResult {
  version: string;
  uri: string;
  latest: boolean;
  complete: boolean;
  missingFiles: string[];
  files: ComparisonFileResult[];
  totals: ComparisonTotals | null;
}

export interface ComparisonReport {
  metric: "gzip";
  packageName: string;
  releaseStream?: number;
  baseline: {
    version: string;
    uri: string;
  };
  localRoot: string;
  files: ComparisonFileResult[];
  totals: ComparisonTotals;
  history: ReleaseComparisonResult[];
}

export interface ActionConfig {
  localRoot: string;
  packageName: string;
  releaseStream?: number;
  filePaths: string[];
  outputFile: string;
  commentPr: boolean;
  githubToken: string;
}

export interface NpmReleaseBaseline {
  version: string;
  uri: string;
  latest: boolean;
}

export interface BaselineReleaseArchive extends NpmReleaseBaseline {
  files: Map<string, Buffer>;
}

export interface TarEntry {
  path: string;
  content: Buffer;
}
