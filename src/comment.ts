import type {
  ComparisonFileResult,
  ComparisonReport,
  ReleaseComparisonResult,
} from "@/types";

export const BUNDLE_SIZE_COMMENT_MARKER = "<!-- axios-bundle-size-comment -->";

function formatBytes(bytes: number): string {
  const sign = bytes < 0 ? "-" : "";
  const absoluteBytes = Math.abs(bytes);

  if (absoluteBytes < 1024) {
    return `${sign}${absoluteBytes} B`;
  }

  return `${sign}${(absoluteBytes / 1024).toFixed(1)} KiB`;
}

function formatDelta(deltaBytes: number, deltaPercent: number | null): string {
  const formattedBytes = formatBytes(deltaBytes);

  if (deltaPercent === null) {
    return formattedBytes;
  }

  const sign = deltaPercent > 0 ? "+" : "";
  return `${formattedBytes} (${sign}${deltaPercent.toFixed(2)}%)`;
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function renderMarkdownCodeSpan(value: string): string {
  const escapedValue = escapeMarkdownTableCell(value);
  const backtickRuns = escapedValue.match(/`+/g) ?? [];
  const delimiterLength = Math.max(0, ...backtickRuns.map((run) => run.length)) + 1;
  const delimiter = "`".repeat(delimiterLength);
  const padding = escapedValue.startsWith("`") || escapedValue.endsWith("`") ? " " : "";

  return `${delimiter}${padding}${escapedValue}${padding}${delimiter}`;
}

export function statusEmoji(deltaPercent: number | null): string {
  if (deltaPercent === null) {
    return "⚪";
  }

  if (deltaPercent <= 1) {
    return "🟢";
  }

  if (deltaPercent <= 3) {
    return "🔵";
  }

  if (deltaPercent <= 6) {
    return "🟡";
  }

  if (deltaPercent <= 9) {
    return "🟠";
  }

  return "🔴";
}

function renderFileRow(file: ComparisonFileResult): string {
  return `| ${renderMarkdownCodeSpan(file.path)} | ${formatBytes(file.baselineBytes)} | ${formatBytes(file.currentBytes)} | ${formatDelta(file.deltaBytes, file.deltaPercent)} | ${statusEmoji(file.deltaPercent)} |`;
}

function renderReleaseLabel(release: ReleaseComparisonResult): string {
  const suffix = release.latest ? " latest" : "";

  return `${renderMarkdownCodeSpan(release.version)}${suffix}`;
}

function renderHistoryRow(release: ReleaseComparisonResult): string {
  if (!release.totals) {
    const missingFiles = release.missingFiles.map(renderMarkdownCodeSpan).join(", ");

    return `| ${renderReleaseLabel(release)} | n/a | n/a | Incomplete: missing ${missingFiles} | ⚪ |`;
  }

  return `| ${renderReleaseLabel(release)} | ${formatBytes(release.totals.baselineBytes)} | ${formatBytes(release.totals.currentBytes)} | ${formatDelta(release.totals.deltaBytes, release.totals.deltaPercent)} | ${statusEmoji(release.totals.deltaPercent)} |`;
}

export function renderBundleSizeComment(report: ComparisonReport): string {
  const rows = report.files.map(renderFileRow);

  rows.push(
    `| **Total** | **${formatBytes(report.totals.baselineBytes)}** | **${formatBytes(report.totals.currentBytes)}** | **${formatDelta(report.totals.deltaBytes, report.totals.deltaPercent)}** | **${statusEmoji(report.totals.deltaPercent)}** |`,
  );

  return [
    BUNDLE_SIZE_COMMENT_MARKER,
    "",
    "## Bundle Size Report",
    "",
    `Compared current build against latest npm release ${renderMarkdownCodeSpan(report.baseline.version)} for ${renderMarkdownCodeSpan(report.packageName)}.`,
    "",
    "| File | Baseline gzip | Current gzip | Difference | Status |",
    "|---|---:|---:|---:|:---:|",
    ...rows,
    "",
    "<details>",
    "<summary>Historical comparison: latest + 10 previous npm releases</summary>",
    "",
    "| Release | Baseline gzip | Current gzip | Difference | Status |",
    "|---|---:|---:|---:|:---:|",
    ...report.history.map(renderHistoryRow),
    "",
    "</details>",
  ].join("\n");
}
