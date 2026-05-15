## Context

The action currently exposes only a placeholder `path` input and does not perform bundle-size analysis. The desired first workflow is for pull requests to build the project, then compare the resulting local `dist` files against the same files from a published tarball URI.

GitHub pull request workflows can run against the merge ref, so the local files represent the artifacts that would exist after merge when the workflow builds before invoking this action.

## Goals / Non-Goals

**Goals:**

- Accept an explicit tarball URI as the baseline artifact source.
- Accept caller-provided file paths to compare between local build output and tarball contents.
- Measure gzip size for each configured file.
- Write a comparison file that captures baseline size, current size, and delta per file.
- Fail on configuration, fetch, archive, or missing-file errors so reports are trustworthy.

**Non-Goals:**

- Enforce target sizes, budgets, or thresholds.
- Resolve package-manager aliases such as `npm:axios@latest`.
- Build the project before comparison.
- Post PR comments directly.
- Store historical baselines.

## Decisions

### Use Tarball URI As The Baseline Contract

The action will accept a tarball URI rather than resolving package manager names or tags. This keeps the first version explicit and avoids registry-specific behavior.

Alternatives considered:

- Package shorthand such as `npm:axios@latest`: convenient, but requires registry resolution and tag handling.
- Local baseline file: useful later, but does not satisfy comparing against published package artifacts.

### Compare The Same Relative Paths On Both Sides

Configured file paths are resolved relative to the local `path` input and relative to the tarball package root. For npm-style tarballs, the implementation should hide the common single top-level archive directory such as `package/`.

Alternatives considered:

- Require archive-internal paths like `package/dist/axios.min.js`: precise, but leaks packaging details into workflow config.
- Support separate local and baseline path maps: more flexible, but unnecessary for the first workflow and more error-prone.

### Gzip Size Is The Canonical Metric

The comparison will gzip each file's bytes and record the compressed byte length. The action should not assume files are already compressed.

Alternatives considered:

- Raw byte size: simpler, but less representative for shipped JavaScript bundle review.
- Brotli size: valuable for modern delivery, but gzip is the expected first metric and has broad familiarity.

### JSON Is The First Comparison File Format

The action will write a machine-readable JSON comparison file. Markdown summaries or PR comments can be built from this data in later changes.

The file should include the metric, tarball URI, local root, compared files, baseline bytes, current bytes, byte delta, and percent delta.

Alternatives considered:

- Markdown only: better for humans, worse for downstream automation.
- Both JSON and Markdown: useful eventually, but larger than needed for the first capability.

## Risks / Trade-offs

- Tarball layout may not have a single predictable root directory -> Normalize paths by stripping a single common top-level directory when present and fail with a clear error when configured files cannot be matched.
- Downloading arbitrary URIs can be slow or fail transiently -> Use normal HTTP error handling and surface actionable failures; retry behavior can be added later if needed.
- Gzip output can vary if metadata is included -> Measure compressed bytes using deterministic in-memory gzip settings where possible and avoid writing gzip files to disk.
- Report-only behavior may allow size regressions to merge -> This is intentional for the first version; threshold enforcement can be a separate capability.
