## 1. Remove Built-In Comment Runtime

- [x] 1.1 Remove `comment-pr` and `github-token` from `action.yml`.
- [x] 1.2 Remove PR comment inputs from configuration parsing, shared config types, and related config tests.
- [x] 1.3 Remove the PR comment API invocation from action orchestration while preserving JSON report writing and existing action outputs.
- [x] 1.4 Remove built-in GitHub comments API code and exports, or document why any remaining renderer-only code is still required.

## 2. Preserve Comment Rendering Contract For Documentation

- [x] 2.1 Decide whether to keep a testable Markdown renderer module or move the renderer entirely into documentation examples.
- [x] 2.2 Add or update tests that lock the documented comment structure, marker, byte formatting, delta formatting, status thresholds, release-stream wording, and incomplete historical release wording.
- [x] 2.3 Ensure no runtime path posts comments or calls the GitHub comments API.
- [x] 2.4 Add Markdown report output configuration, file writing, action output, and path-safety tests.

## 3. Update Documentation

- [x] 3.1 Update the README input table and basic examples to remove built-in PR comment inputs.
- [x] 3.2 Add a same-repository PR recipe that reads `bundle-size-comparison.md` and creates or updates the marked pull request comment.
- [x] 3.3 Add a public fork-safe recipe that runs comparison in `pull_request`, uploads the Markdown report artifact, and posts the comment from a trusted `workflow_run` workflow.
- [x] 3.4 Document that the same-workflow comment recipe does not bypass read-only `GITHUB_TOKEN` restrictions for public fork pull requests.
- [x] 3.5 Document why `pull_request_target` must not checkout, install, build, or otherwise execute pull-request-controlled code with writable credentials.
- [x] 3.6 Simplify comment recipes so workflows read and post the generated Markdown file instead of rendering Markdown from JSON.

## 4. Update Security And Contributor Notes

- [x] 4.1 Update `THREAT_MODEL.md` to reflect that comment publishing is external workflow code and the action no longer consumes a comment token.
- [x] 4.2 Update `CONTRIBUTING.md` and `COLLABORATOR_GUIDE.md` references to built-in PR comment API behavior.
- [x] 4.3 Update this repository's bundle-size workflow if needed to follow the new external-comment action behavior.

## 5. Verify And Build

- [x] 5.1 Run `pnpm run lint` and fix reported issues.
- [x] 5.2 Run `pnpm run typecheck` and fix reported issues.
- [x] 5.3 Run `pnpm test` and fix reported issues.
- [x] 5.4 Run `pnpm run build` and commit the updated `dist/index.js` with the source and action metadata changes.
