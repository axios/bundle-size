## Why

The current test suite is concentrated in a single catch-all test file and only covers a subset of the source modules. Splitting tests by source module and expanding edge-case coverage will make behavior easier to review, safer to change, and aligned with the repository's modular source layout.

## What Changes

- Replace the existing broad `tests/index.test.js` organization with module-aligned tests for each runtime source file under `src/`, excluding `src/index.ts`.
- Move existing path, config, tarball, and comparison tests into their matching test files.
- Add focused coverage for `src/action.ts`, `src/report.ts`, and any uncovered edge cases in existing modules.
- Use a mocked `fetch` in `action.test.js` with a realistic npm axios tarball URL and npm-style `package/` archive layout, avoiding live network dependency while exercising the action orchestration path.
- Keep tests deterministic and based on Node's built-in test runner.
- Do not change runtime action behavior, inputs, outputs, dependencies, or generated `dist/` output as part of this test-only change.

## Capabilities

### New Capabilities

- None. This change improves test coverage and organization without adding user-facing behavior.

### Modified Capabilities

- None. The existing `tarball-gzip-comparison` requirements remain unchanged.

## Impact

- Affected tests: `tests/` will be reorganized into module-specific test files.
- Affected source: no runtime source changes are intended, except possible minimal testability adjustments if implementation reveals a hard blocker.
- Affected specs: no product requirement changes are expected.
- Affected dependencies: no new runtime or development dependencies are expected.
- Affected build output: `dist/index.js` should not change unless runtime source changes become necessary.
