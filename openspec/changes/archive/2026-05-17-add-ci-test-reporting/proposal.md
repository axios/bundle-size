## Why

Pull requests currently run the test suite, but reviewers have to open job logs to inspect detailed test results and coverage. Surfacing Vitest results through GitHub's native check/report UI and exposing coverage in CI output makes repository health easier to review without expanding the bundle-size action product surface.

## What Changes

- Configure the repository test workflow to emit machine-readable Vitest test results for `dorny/test-reporter@v3`.
- Add `dorny/test-reporter@v3` to the pull request CI workflow so test results are visible in GitHub's PR checks and/or Actions summary.
- Add Vitest coverage generation for the repository test suite and surface the coverage summary in CI output.
- Keep this behavior scoped to this repository's workflow; it is not a new input, output, or runtime behavior of the bundle-size action.

Non-goals:

- Do not add test reporting or coverage reporting as a feature of the published bundle-size action.
- Do not change action inputs, outputs, report structure, tarball handling, gzip comparison semantics, or PR bundle-size comment behavior.
- Do not introduce coverage thresholds or make coverage percentage changes fail CI as part of this change.
- Do not create a custom sticky PR comment for coverage unless a later change explicitly chooses that direction.

## Capabilities

### New Capabilities

- `ci-test-reporting`: Repository CI emits test result and coverage information and publishes Vitest test results through GitHub's native reporting surface.

### Modified Capabilities

- `source-test-suite`: The repository test suite gains CI-oriented result and coverage output while preserving Vitest as the test runner.

## Impact

- Affects `.github/workflows/bundle-size.yml`, Vitest/package test configuration or scripts, documentation that describes repository validation commands, and OpenSpec specs for repository test reporting.
- Adds or configures test result output consumed by `dorny/test-reporter@v3`.
- May add Vitest coverage support if the current Vitest setup does not already include the required coverage provider.
- Does not require changes to `src/`, `action.yml`, action runtime dependencies, or `dist/index.js` unless implementation uncovers an unexpected need.
