## 1. Inputs And Configuration

- [x] 1.1 Add action inputs for tarball URI, compared file paths, and comparison output file path.
- [x] 1.2 Parse and validate the tarball URI and newline-delimited file paths in the action entrypoint.
- [x] 1.3 Preserve local project root resolution through the existing `path` input.

## 2. Baseline And Local Artifact Loading

- [x] 2.1 Download the configured tarball URI and surface HTTP or network failures clearly.
- [x] 2.2 Extract or inspect tarball entries and normalize paths by stripping a single common top-level directory when present.
- [x] 2.3 Resolve each configured baseline file from the tarball and fail with a named error when missing.
- [x] 2.4 Resolve each configured current file from the local project root and fail with a named error when missing.

## 3. Gzip Comparison Report

- [x] 3.1 Measure deterministic gzip byte size for every baseline and current file.
- [x] 3.2 Compute byte and percent deltas for every configured file.
- [x] 3.3 Write the JSON comparison file with metric, tarball URI, local root, and per-file results.
- [x] 3.4 Set useful action outputs for downstream workflow steps if appropriate.

## 4. Documentation And Verification

- [x] 4.1 Update README usage examples for PR workflows that build before running the action.
- [x] 4.2 Update the sample workflow to demonstrate tarball comparison inputs.
- [x] 4.3 Add or update tests for input validation, tarball path normalization, gzip measurement, and report generation.
- [x] 4.4 Build the TypeScript source and committed `dist` bundle.
