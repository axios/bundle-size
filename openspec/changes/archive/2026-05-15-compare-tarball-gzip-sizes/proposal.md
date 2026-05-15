## Why

Pull requests need a clear view of how built bundle artifacts will change after merge without requiring a target size or release-specific manual comparison. Comparing the PR's generated `dist` files against a published tarball baseline gives maintainers a reproducible gzip-size report for review.

## What Changes

- Add action inputs for a tarball URI and newline-delimited file paths to compare.
- Generate a comparison file showing gzip sizes for each configured file in the local build and baseline tarball.
- Treat the action as report-only for this change: no target size, budget, or threshold enforcement.
- Fail on invalid configuration, unreachable tarball URI, unreadable tarball contents, or missing configured files.
- Preserve `path` as the local project root for resolving current build artifacts.

## Capabilities

### New Capabilities

- `tarball-gzip-comparison`: Compare configured local build artifact paths against matching files from a tarball URI and produce a gzip-size comparison file.

### Modified Capabilities

- None.

## Impact

- Affects the GitHub Action input contract in `action.yml`.
- Affects runtime behavior in `src/index.ts` and the bundled `dist/index.js`.
- May require dependencies for downloading tarballs, reading compressed archives, and measuring gzip size.
- Updates README and example workflow documentation to show PR comparison usage.
