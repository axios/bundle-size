## Requirements

### Requirement: Tests Run With Vitest
The repository SHALL run the TypeScript test suite with Vitest version `4.1.6`.

#### Scenario: Test command runs
- **WHEN** a developer runs `pnpm test`
- **THEN** Vitest executes the repository's TypeScript test files

#### Scenario: Package metadata is inspected
- **WHEN** dependency tooling reads the package manifest
- **THEN** Vitest is declared as a development dependency at version `4.1.6`

### Requirement: Tests Use Source Aliases
The repository SHALL support `@/` aliases and extensionless project imports in TypeScript tests.

#### Scenario: Test imports project module
- **WHEN** a test imports a module under `src/`
- **THEN** the import can use an extensionless specifier with the `@/` alias

### Requirement: Module-Aligned Source Tests
The repository SHALL provide TypeScript module-aligned tests for each runtime source module under `src/`, excluding `src/index.ts`.

#### Scenario: Runtime source modules have matching tests
- **WHEN** a runtime source module exists under `src/`
- **THEN** the test suite contains a corresponding TypeScript test file for that module's behavior

#### Scenario: Bootstrap index is excluded
- **WHEN** `src/index.ts` only bootstraps and re-exports testable helpers
- **THEN** the test suite does not require a dedicated `index.test.ts`

### Requirement: Existing Coverage Is Preserved During Reorganization
The repository SHALL preserve existing test coverage when converting JavaScript tests into TypeScript module-specific test files.

#### Scenario: Existing tests are moved
- **WHEN** tests for paths, config, tarball, comparison, reports, comments, or action orchestration behavior already exist
- **THEN** those tests are converted to TypeScript and preserved in the matching module test file rather than removed

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

### Requirement: CI Test Suite Emits Reporting Artifacts
The repository test suite SHALL support CI-oriented output artifacts for test reporting and coverage while preserving Vitest as the test runner.

#### Scenario: JUnit-compatible test results are requested
- **WHEN** CI runs the repository test suite for reporting
- **THEN** the test suite emits JUnit-compatible test results at a stable path

#### Scenario: Coverage summary is requested
- **WHEN** CI runs the repository test suite with coverage enabled
- **THEN** the test suite emits coverage summary data at a stable path

#### Scenario: Local test workflow remains available
- **WHEN** a developer runs the standard local test command
- **THEN** the command continues to run the Vitest suite without requiring GitHub Actions reporting context
