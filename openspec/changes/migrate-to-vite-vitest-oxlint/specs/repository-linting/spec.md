## ADDED Requirements

### Requirement: Repository Uses Oxlint
The repository SHALL provide an Oxlint-based lint command using Oxlint version `1.65.0`.

#### Scenario: Lint command runs
- **WHEN** a developer runs `pnpm run lint`
- **THEN** the repository runs Oxlint against the project files

#### Scenario: Package metadata is inspected
- **WHEN** dependency tooling reads the package manifest
- **THEN** Oxlint is declared as a development dependency at version `1.65.0`

### Requirement: Type Checking Remains Separate From Linting
The repository SHALL provide a dedicated type-checking command that runs TypeScript without emitting build output.

#### Scenario: Typecheck command runs
- **WHEN** a developer runs the repository type-check command
- **THEN** TypeScript validates the project with `tsc --noEmit`

#### Scenario: Validation runs in CI
- **WHEN** the repository CI workflow verifies a pull request
- **THEN** linting and type checking both run before the committed action bundle is built
