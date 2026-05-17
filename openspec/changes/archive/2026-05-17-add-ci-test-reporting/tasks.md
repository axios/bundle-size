## 1. Test Output Configuration

- [x] 1.1 Add any required Vitest coverage provider dependency and update the lockfile.
- [x] 1.2 Add or update a CI test command that runs Vitest with human-readable output, JUnit-compatible result output at a stable path, and coverage summary output at a stable path.
- [x] 1.3 Preserve the existing local `pnpm test` behavior for normal developer runs.

## 2. Workflow Reporting

- [x] 2.1 Update `.github/workflows/bundle-size.yml` to run the CI test command instead of the plain test command where reporting artifacts are needed.
- [x] 2.2 Add `dorny/test-reporter@v3` to publish the generated Vitest test results, using `if: ${{ !cancelled() }}` or an equivalent condition so reports can publish after test failures.
- [x] 2.3 Add the workflow permissions required by the reporter while preserving least privilege for the existing workflow.
- [x] 2.4 Add fork or permission handling so test reporting does not turn read-only-token pull requests into unrelated infrastructure failures.
- [x] 2.5 Add a workflow step that exposes the generated coverage summary in a reviewer-visible CI surface such as the GitHub Actions job summary.

## 3. Documentation And Specs

- [x] 3.1 Update repository documentation for the CI test command and reporting behavior if a new script or validation flow is introduced.
- [x] 3.2 Ensure the change remains documented as repository CI behavior, not a bundle-size action feature.

## 4. Verification

- [x] 4.1 Add or update tests that assert repository tooling configuration for the new CI test command and any coverage dependency.
- [x] 4.2 Run `pnpm install --frozen-lockfile` if dependency or lockfile changes are made.
- [x] 4.3 Run `pnpm run lint`.
- [x] 4.4 Run `pnpm run typecheck`.
- [x] 4.5 Run `pnpm test`.
- [x] 4.6 Run the CI test command locally and verify it creates the expected JUnit and coverage files.
- [x] 4.7 Run `pnpm run build` if package/dependency changes require confirming the action bundle remains healthy.
