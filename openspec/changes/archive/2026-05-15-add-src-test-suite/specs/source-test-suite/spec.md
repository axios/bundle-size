## ADDED Requirements

### Requirement: Module-Aligned Source Tests
The repository SHALL provide module-aligned tests for each runtime source module under `src/`, excluding `src/index.ts`.

#### Scenario: Runtime source modules have matching tests
- **WHEN** a runtime source module exists under `src/`
- **THEN** the test suite contains a corresponding test file for that module's behavior

#### Scenario: Bootstrap index is excluded
- **WHEN** `src/index.ts` only bootstraps and re-exports testable helpers
- **THEN** the test suite does not require a dedicated `index.test.js`

### Requirement: Existing Coverage Is Preserved During Reorganization
The repository SHALL preserve existing test coverage when moving tests from the catch-all test file into module-specific test files.

#### Scenario: Existing tests are moved
- **WHEN** tests for paths, config, tarball, or comparison behavior already exist
- **THEN** those tests are moved to the matching module test file rather than removed

### Requirement: Edge Cases Are Covered By Focused Tests
The repository SHALL include focused edge-case tests for path safety, tarball parsing, gzip comparison, report writing, configuration parsing, and action orchestration.

#### Scenario: Unsafe inputs are rejected
- **WHEN** configured paths, tarball metadata, or output paths are malformed or unsafe
- **THEN** the relevant module test asserts that the action rejects them with a useful error

#### Scenario: Comparison output is generated
- **WHEN** valid local and baseline files are compared
- **THEN** tests assert per-file and total gzip byte counts, deltas, and report output shape

### Requirement: Action Tests Are Deterministic
The repository SHALL test action orchestration without depending on live network access.

#### Scenario: Axios npm tarball is mocked
- **WHEN** `run()` downloads `https://registry.npmjs.org/axios/-/axios-<version>.tgz`
- **THEN** the test provides a mocked tarball response containing an npm-style `package/` root and verifies the action writes outputs and a comparison report
