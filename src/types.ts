export interface ComparisonFileResult {
  path: string;
  baselineBytes: number;
  currentBytes: number;
  deltaBytes: number;
  deltaPercent: number | null;
}

export interface ComparisonReport {
  metric: "gzip";
  baseline: {
    uri: string;
  };
  localRoot: string;
  files: ComparisonFileResult[];
  totals: {
    baselineBytes: number;
    currentBytes: number;
    deltaBytes: number;
    deltaPercent: number | null;
  };
}

export interface ActionConfig {
  localRoot: string;
  tarballUri: string;
  filePaths: string[];
  outputFile: string;
  commentPr: boolean;
  githubToken: string;
}

export interface TarEntry {
  path: string;
  content: Buffer;
}
