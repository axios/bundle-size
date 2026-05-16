import type { ComparisonFileResult, ComparisonReport } from "./types";

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
    "| File | Baseline gzip | Current gzip | Difference | Status |",
    "|---|---:|---:|---:|:---:|",
    ...rows,
  ].join("\n");
}
