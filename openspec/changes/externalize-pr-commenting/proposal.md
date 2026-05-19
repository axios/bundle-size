## Why

Built-in pull request commenting cannot reliably support public fork pull requests because GitHub intentionally gives `pull_request` workflow runs from forks a read-only `GITHUB_TOKEN`. The action should keep the bundle-size comparison itself JSON-first and let workflows publish comments from an appropriate trust boundary.

## What Changes

- **BREAKING**: Remove built-in pull request comment posting from the action runtime.
- Remove the `comment-pr` and `github-token` action inputs from the supported action interface.
- Keep the JSON comparison report and existing action outputs as the primary machine-readable integration contract.
- Add a generated Markdown comparison report that uses the same comment body currently produced by the action.
- Document how users can upsert a pull request comment by reading the generated Markdown file.
- Document both same-repository PR commenting and public fork-safe commenting using a two-workflow `pull_request` plus `workflow_run` artifact handoff.
- Keep comment status colors informational only; this change does not add budget or threshold enforcement.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `pr-bundle-size-comment`: replace built-in comment posting with generated Markdown output and documented external workflows that post the Markdown file.

## Impact

- `action.yml`: remove `comment-pr` and `github-token` inputs.
- `src/action.ts`, `src/config.ts`, `src/types.ts`, `src/report.ts`, `src/index.ts`: remove runtime PR commenting configuration and API invocation surfaces and add Markdown report output.
- `src/pr-comment.ts`, related exports, and `tests/pr-comment.test.ts`: remove built-in GitHub comments API behavior unless retained only as non-runtime test support is explicitly justified during implementation.
- `src/comment.ts` and `tests/comment.test.ts`: preserve Markdown rendering coverage so generated Markdown matches the previous comment structure.
- `README.md`: replace built-in commenting documentation with same-repo and fork-safe external commenting recipes that post the generated Markdown file.
- `THREAT_MODEL.md`, `CONTRIBUTING.md`, `COLLABORATOR_GUIDE.md`: update PR-comment security and ownership notes.
- `dist/index.js`: rebuild because runtime code and action metadata change.
