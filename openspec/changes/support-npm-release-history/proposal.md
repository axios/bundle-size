## Why

The action currently compares local artifacts against one caller-provided tarball, which makes each workflow responsible for knowing the latest published package archive and provides no historical context. Axios bundle-size reviews need a first-class npm release baseline that compares the current build against the latest release and the 10 previous releases when they exist.

## What Changes

- **BREAKING** Replace the arbitrary `tarball-uri` baseline input with npm registry package resolution.
- Add a required npm package input that identifies the package whose releases provide bundle-size baselines.
- Resolve the npm `latest` dist-tag and up to 10 previous published stable releases from the npm registry.
- Compare configured local files against the latest release as the primary baseline.
- Compare configured local files against each previous release as historical context.
- Preserve gzip size as the metric and keep configured file paths as user-facing package paths.
- Write a machine-readable JSON report that includes the primary latest-release comparison and historical release comparisons.
- Render PR comments with the latest-release comparison visible by default and historical release comparisons inside a collapsible details section.
- Do not add budget enforcement, threshold failures, artifact uploads, package-manager aliases, or target project build orchestration.

## Capabilities

### New Capabilities

- `npm-release-baselines`: Resolve npm registry package releases and use their tarballs as bundle-size baselines.
- `historical-bundle-size-reporting`: Report and comment on latest plus previous-release bundle-size comparisons.

### Modified Capabilities

- `tarball-gzip-comparison`: Replace caller-provided tarball URI configuration with npm package baseline configuration while preserving local file resolution, tarball artifact resolution, gzip measurement, and no-target-size behavior.

## Impact

- `action.yml` inputs and README usage examples change from `tarball-uri` to npm package configuration.
- `src/config.ts` changes input parsing and validation for npm package names and optional release-history controls.
- A new npm registry resolver module fetches package metadata and selects latest plus previous releases.
- `src/action.ts` orchestrates multiple baseline tarball downloads and comparisons instead of one explicit tarball.
- `src/comparison.ts`, `src/types.ts`, `src/report.ts`, and `src/comment.ts` evolve their report and comment models to include historical comparisons.
- Tests cover npm metadata resolution, release selection, missing release/file behavior, JSON report shape, collapsed PR comment rendering, and the breaking input contract.
- Runtime code changes require `pnpm test` and `pnpm run build`, with `dist/index.js` committed alongside source changes.
