## 1. Test Layout

- [x] 1.1 Inventory current `tests/index.test.js` coverage and map each test to its owning source module.
- [x] 1.2 Create module-aligned test files for `action`, `comparison`, `config`, `paths`, `report`, and `tarball`.
- [x] 1.3 Move existing tests from `tests/index.test.js` into the matching module test files.
- [x] 1.4 Remove the catch-all `tests/index.test.js` once its coverage has been moved.

## 2. Module Coverage

- [x] 2.1 Expand `paths` tests to cover normalization, duplicate handling, traversal rejection, root containment, and valid dotted path names.
- [x] 2.2 Expand `config` tests to cover tarball URI validation, default inputs, multiline files input parsing, and invalid output paths.
- [x] 2.3 Expand `tarball` tests to cover download success/failure, invalid gzip payloads, malformed tar metadata, regular-file filtering, truncation, and package-root stripping behavior.
- [x] 2.4 Expand `comparison` tests to cover multiple files, gzip byte deltas, percent deltas, zero-baseline percent handling, and missing baseline/local file errors.
- [x] 2.5 Add `report` tests for nested directory creation, pretty JSON output with trailing newline, returned output path, and unsafe output path rejection.
- [x] 2.6 Add `action` orchestration tests using mocked `fetch`, GitHub Actions-style inputs, a realistic axios npm tarball URL, an npm-style `package/` tarball layout, and `GITHUB_OUTPUT` assertions.
- [x] 2.7 Confirm `types.ts` remains covered by TypeScript compilation and does not need a low-value runtime test.

## 3. Verification

- [x] 3.1 Run `pnpm test` and fix any failures.
- [x] 3.2 Confirm the final change is test-only and does not require `dist/index.js` updates.
