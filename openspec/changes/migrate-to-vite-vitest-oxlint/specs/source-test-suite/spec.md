## ADDED Requirements

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

## MODIFIED Requirements

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
