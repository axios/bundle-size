## ADDED Requirements

### Requirement: Action Bundle Is Built With Vite
The repository SHALL build the committed GitHub Action bundle with Vite version `8.0.10` directly from the TypeScript source entrypoint.

#### Scenario: Build command runs
- **WHEN** a developer runs `pnpm run build`
- **THEN** Vite bundles `src/index.ts` into the committed action entrypoint at `dist/index.js`

#### Scenario: Runtime dependencies are bundled
- **WHEN** the Vite build produces `dist/index.js`
- **THEN** runtime package dependencies required by the action are included in the bundle so action consumers do not need to install dependencies

### Requirement: Intermediate Lib Output Is Removed
The repository SHALL NOT require a normal `lib/` compilation output for building, testing, or running the action.

#### Scenario: Build and test scripts are inspected
- **WHEN** dependency tooling reads the package scripts
- **THEN** normal build and test commands do not depend on emitted files under `lib/`

### Requirement: Ncc Is Removed
The repository SHALL NOT use `@vercel/ncc` to build the action bundle.

#### Scenario: Package metadata is inspected
- **WHEN** dependency tooling reads the package manifest
- **THEN** `@vercel/ncc` is not declared as a dependency or development dependency

#### Scenario: Build scripts are inspected
- **WHEN** dependency tooling reads the package scripts
- **THEN** no build script invokes `ncc`

### Requirement: Dist License File Is Not Required
The repository SHALL NOT require `dist/licenses.txt` as part of the built action artifact.

#### Scenario: Build output is inspected
- **WHEN** the Vite build completes
- **THEN** the required committed runtime artifact is `dist/index.js` and no generated `dist/licenses.txt` file is required

### Requirement: Bundler-Aware Source Imports
The repository SHALL support extensionless project imports and `@/` aliases in source files through TypeScript and Vite configuration.

#### Scenario: Source imports project module
- **WHEN** a source module imports another project source module
- **THEN** the import can use an extensionless specifier with the `@/` alias

## MODIFIED Requirements

### Requirement: CI Verifies With Supported Toolchain
The repository CI workflow SHALL install dependencies, lint, type-check, test, and build using Node 24 and pnpm 11.

#### Scenario: Bundle-size workflow runs
- **WHEN** the repository bundle-size workflow executes
- **THEN** it sets up Node 24 and pnpm 11 before installing dependencies, linting, type-checking, testing, building the action bundle, and invoking the local action

### Requirement: Documentation Matches Runtime Toolchain
The repository documentation SHALL describe Node 24 and pnpm 11 as the required toolchain, SHALL identify Node 24 as the action runtime, and SHALL describe Vite as the action bundler.

#### Scenario: Developer reads build prerequisites
- **WHEN** a developer reads the repository build instructions
- **THEN** the documented prerequisites list Node 24 and pnpm 11

#### Scenario: Developer reads action runtime description
- **WHEN** a developer reads how the action runs
- **THEN** the documentation states that GitHub Actions executes `dist/index.js` with the Node 24 runtime

#### Scenario: Developer reads bundle instructions
- **WHEN** a developer reads how the action bundle is produced
- **THEN** the documentation states that Vite builds the committed `dist/index.js` action bundle directly from TypeScript source
