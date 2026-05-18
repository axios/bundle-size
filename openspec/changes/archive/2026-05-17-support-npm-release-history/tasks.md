## 1. Inputs And Configuration

- [x] 1.1 Update `action.yml` to replace `tarball-uri` with an npm package name input.
- [x] 1.2 Update `src/config.ts` and shared config types to validate the npm package input and remove tarball URI validation from the action configuration path.
- [x] 1.3 Add configuration tests covering missing package names, valid unscoped package names, valid scoped package names, and the removed `tarball-uri` contract.

## 2. Npm Registry Release Resolution

- [x] 2.1 Add an npm registry resolver module that fetches package metadata from the public npm registry using Node built-ins.
- [x] 2.2 Resolve the `latest` dist-tag, selected version records, publish times, and `dist.tarball` URLs from npm metadata.
- [x] 2.3 Select the latest release plus up to 10 previous stable releases ordered by publish time.
- [x] 2.4 Add resolver tests for scoped package URL encoding, missing latest metadata, missing tarball URLs, fewer than 10 previous releases, more than 10 previous releases, and failed registry responses.

## 3. Multi-Release Comparison Model

- [x] 3.1 Extend shared report types to represent npm package metadata, the primary latest-release comparison, and historical release comparisons.
- [x] 3.2 Refactor comparison logic so the latest baseline remains strict while previous-release missing files are recorded as incomplete history instead of failing the action.
- [x] 3.3 Preserve gzip byte sizing, delta bytes, and delta percent semantics for every complete file comparison.
- [x] 3.4 Add comparison tests for latest missing files, previous-release missing files, complete historical releases, and total calculations.

## 4. Action Orchestration And Outputs

- [x] 4.1 Update `src/action.ts` to resolve npm releases, download each selected release tarball, extract files, and build the multi-release report.
- [x] 4.2 Keep existing size-related action outputs tied to the latest release baseline.
- [x] 4.3 Add action orchestration tests with mocked npm metadata and mocked release tarball downloads, without live network access.

## 5. Reports, Comments, And Documentation

- [x] 5.1 Update JSON report writing tests to cover package identity, latest baseline metadata, historical results, and incomplete historical releases.
- [x] 5.2 Update PR comment rendering so the latest comparison remains visible and historical release summaries render inside a `<details>` block.
- [x] 5.3 Add comment tests for the collapsed history section, release-level rows, incomplete historical releases, and the no-previous-release case.
- [x] 5.4 Update README inputs, usage examples, report shape, and workflow guidance for npm-only release baselines.
- [x] 5.5 Update repository workflow fixtures or examples that still pass `tarball-uri`.

## 6. Verification And Build Artifacts

- [x] 6.1 Run `pnpm run lint` and fix reported lint issues.
- [x] 6.2 Run `pnpm run typecheck` and fix TypeScript errors.
- [x] 6.3 Run `pnpm test` and confirm the test suite passes.
- [x] 6.4 Run `pnpm run build` and commit the updated `dist/index.js` output.
- [x] 6.5 Inspect `dist/index.js`, `action.yml`, README, and tests to confirm the committed action matches the npm-only release history contract.
