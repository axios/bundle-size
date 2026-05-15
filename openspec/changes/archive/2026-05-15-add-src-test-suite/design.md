## Context

The source code is organized into focused modules under `src/`, but the current tests are concentrated in `tests/index.test.js`. Existing tests already cover portions of path parsing, tarball extraction, tarball URI validation, and comparison report generation, but they are not organized by source module and do not cover every runtime source file.

The action tests run with Node's built-in test runner after TypeScript compiles to `lib/`, so tests should continue importing compiled CommonJS files from `lib/` rather than TypeScript source files. Because this change is test-only, runtime behavior should remain unchanged unless implementation exposes a small testability blocker.

## Goals / Non-Goals

**Goals:**

- Create module-aligned test files for every runtime source module under `src/`, excluding `src/index.ts`.
- Move the existing tests out of `tests/index.test.js` into the matching module test files.
- Expand coverage for uncovered modules and relevant edge cases.
- Exercise `src/action.ts` with a mocked `fetch` response using an npm axios tarball URL and npm-style `package/` tarball layout.
- Keep the suite deterministic and network-free.

**Non-Goals:**

- No live npm registry/network tests.
- No new runtime or development dependencies.
- No changes to action inputs, outputs, report shape, tarball resolution behavior, or gzip semantics.
- No target-size enforcement, PR comments, Markdown summaries, or artifact upload behavior.

## Decisions

- Use one test file per runtime source module: `action.test.js`, `comparison.test.js`, `config.test.js`, `paths.test.js`, `report.test.js`, and `tarball.test.js`.
- Do not create a meaningful runtime test for `types.ts` unless strict file parity is required during implementation; TypeScript compilation is the real validation for interface-only code.
- Delete or empty the catch-all `tests/index.test.js` after moving its coverage so new tests do not continue accumulating there.
- Keep tests on Node's built-in `node:test` and `node:assert/strict` APIs to avoid adding test dependencies.
- For `action.test.js`, set GitHub Actions-style input environment variables and mock `global.fetch` to return a gzipped tar archive containing `package/dist/axios.min.js` for `https://registry.npmjs.org/axios/-/axios-<version>.tgz`.
- Prefer direct module tests for edge cases and a single orchestration test for `run()` rather than broad end-to-end coverage in every file.

## Risks / Trade-offs

- `@actions/core` reads inputs from process environment, so tests can leak state between cases if environment variables are not restored. Mitigation: snapshot and restore relevant env keys in action/config tests.
- `core.setOutput` writes to `GITHUB_OUTPUT` when present and may write command output otherwise. Mitigation: use a temporary `GITHUB_OUTPUT` file for action tests and assert its contents.
- Tarball fixture helpers can become duplicated across test files. Mitigation: keep helpers local unless reuse becomes substantial; avoid creating shared test infrastructure prematurely.
- Testing `types.ts` as a runtime module provides little value. Mitigation: rely on `pnpm test` compilation and document that `src/index.ts` is intentionally excluded while `types.ts` is compile-checked.
