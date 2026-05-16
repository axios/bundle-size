## Requirements

### Requirement: GitHub Action Uses Node 24 Runtime
The action SHALL declare the Node 24 GitHub Actions runtime for executing the committed action bundle.

#### Scenario: Action metadata is inspected
- **WHEN** a workflow resolves this repository as a GitHub Action
- **THEN** the action metadata declares `runs.using` as `node24`

#### Scenario: Action bundle remains the runtime entrypoint
- **WHEN** a workflow invokes the action
- **THEN** GitHub Actions executes the committed `dist/index.js` bundle as the action entrypoint

### Requirement: Repository Requires Node 24 And pnpm 11
The repository SHALL declare Node 24 and pnpm 11 as the supported development, install, test, and build toolchain.

#### Scenario: Package metadata is inspected
- **WHEN** dependency tooling reads the package manifest
- **THEN** the manifest requires Node 24 and pnpm 11

#### Scenario: Package manager is resolved
- **WHEN** Corepack or compatible tooling reads the package manifest
- **THEN** it resolves an exact pnpm 11 package-manager version

### Requirement: CI Verifies With Supported Toolchain
The repository CI workflow SHALL install dependencies, test, and build using Node 24 and pnpm 11.

#### Scenario: Bundle-size workflow runs
- **WHEN** the repository bundle-size workflow executes
- **THEN** it sets up Node 24 and pnpm 11 before installing dependencies, building the action bundle, and invoking the local action

### Requirement: Documentation Matches Runtime Toolchain
The repository documentation SHALL describe Node 24 and pnpm 11 as the required toolchain and SHALL identify Node 24 as the action runtime.

#### Scenario: Developer reads build prerequisites
- **WHEN** a developer reads the repository build instructions
- **THEN** the documented prerequisites list Node 24 and pnpm 11

#### Scenario: Developer reads action runtime description
- **WHEN** a developer reads how the action runs
- **THEN** the documentation states that GitHub Actions executes `dist/index.js` with the Node 24 runtime
