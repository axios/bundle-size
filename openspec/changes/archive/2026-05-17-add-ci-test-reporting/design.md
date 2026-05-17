## Context

The repository already runs lint, typecheck, tests, build, and the local bundle-size action in `.github/workflows/bundle-size.yml`. Test failures are visible through the workflow status, but detailed test results and coverage require opening raw logs. The project now uses Vitest, which can emit machine-readable test results and coverage summaries suitable for CI reporting.

This change is repository workflow infrastructure. It must not add features to the published bundle-size action or alter action runtime behavior.

## Goals / Non-Goals

**Goals:**

- Publish Vitest test results in GitHub's native PR/check reporting surface using `dorny/test-reporter@v3`.
- Generate coverage during the CI test run and expose a concise coverage summary in CI output.
- Keep the local developer test command straightforward while adding CI-specific reporting output where appropriate.
- Preserve existing validation behavior: lint, typecheck, tests, build, and bundle-size comparison still gate the workflow.

**Non-Goals:**

- Do not add test reporting, coverage reporting, or coverage thresholds to the bundle-size action itself.
- Do not add or change action inputs, outputs, JSON report shape, PR bundle-size comment behavior, or `dist/index.js` runtime output.
- Do not create a sticky PR comment for tests or coverage in this change.
- Do not introduce coverage percentage gates.

## Decisions

1. Use `dorny/test-reporter@v3` for test results.

   The user selected this action, and it is purpose-built for rendering machine-readable test result files into GitHub checks and Actions summaries. The workflow will consume Vitest's JUnit-compatible output rather than adding custom test-report rendering code to this repository.

   Alternative considered: implement a custom Markdown PR comment. That would duplicate reporting behavior, require custom comment upsert logic, and drift away from the goal of using GitHub-native reporting.

2. Emit JUnit-compatible Vitest results at a stable path.

   `dorny/test-reporter` needs a file to parse. A CI-specific test command or workflow invocation should write a JUnit-compatible report such as `reports/vitest-junit.xml` while preserving human-readable test output in logs.

   Alternative considered: parse default Vitest console output. Console output is not a stable machine-readable contract and would make reporting brittle.

3. Generate coverage as part of the CI test run and summarize it separately from `dorny/test-reporter`.

   `dorny/test-reporter` reports test cases; it does not provide first-class Vitest coverage reporting. Coverage should come from Vitest coverage output, with a concise summary exposed through the workflow logs or GitHub Actions job summary.

   Alternative considered: add a dedicated third-party coverage PR comment action. That can be revisited later, but it is unnecessary for the current goal and would introduce more workflow permissions and another reporting surface.

4. Keep PR reporting best-effort for permission-constrained pull requests.

   `dorny/test-reporter` creates check runs and needs `checks: write`. GitHub gives forked pull requests read-only tokens, so a direct `pull_request` workflow cannot reliably create check runs for forks. The initial workflow should either skip the reporter when write permissions are unavailable or use a follow-up two-workflow artifact pattern if fork reporting becomes important.

   Alternative considered: immediately adopt `workflow_run` plus uploaded artifacts. That is more robust for public fork PRs, but it is also a larger workflow architecture change than needed for this repository-scoped visibility improvement.

## Risks / Trade-offs

- `dorny/test-reporter` cannot create check runs with a read-only token on fork pull requests -> Gate or skip the reporter for fork PRs, and keep raw test logs available as the fallback.
- Vitest JUnit output may require a specific reporter/path CLI syntax -> Verify the exact command during implementation and keep it encoded in a package script or a single workflow step.
- Coverage support may require adding Vitest's coverage provider as a dev dependency -> Keep it as a dev-only dependency and do not bundle it into `dist/index.js`.
- Separate test and coverage reporting surfaces can feel split -> Prefer GitHub-native checks/job summaries now; revisit a unified comment only if reviewers find the native surfaces insufficient.
- A failing test step can prevent report generation if workflow conditions are wrong -> Run the test reporter step with an explicit non-cancelled condition so it still publishes results after test failures.

## Migration Plan

1. Add or update CI test command(s) to produce Vitest JUnit and coverage summary files.
2. Update the pull request workflow to run the CI test command and invoke `dorny/test-reporter@v3` against the generated JUnit file.
3. Add coverage summary output to the workflow.
4. Run local validation commands and review the workflow diff for permission and fork behavior.

Rollback is straightforward: remove the reporter and coverage-specific workflow/script changes. The existing `pnpm test` command and action runtime behavior should remain intact.

## Open Questions

- Should fork PRs receive test reports through a later `workflow_run` artifact-reporting setup, or is same-repository PR reporting sufficient for now?
- Should the coverage summary be limited to logs, or should implementation write a short Markdown table to `$GITHUB_STEP_SUMMARY`?
