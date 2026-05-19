## Context

The action currently has two responsibilities: compute gzip bundle-size comparisons and optionally publish the rendered result as a pull request comment. The comment-publishing path works for same-repository pull requests when the workflow grants a writable token, but it cannot reliably support public fork pull requests because GitHub makes `GITHUB_TOKEN` read-only for `pull_request` runs from forks.

The comparison result is already written as a machine-readable JSON report. The action can also write the same safely rendered Markdown body it previously posted directly, making external comment publishing simple without keeping GitHub API calls in the action runtime.

## Goals / Non-Goals

**Goals:**

- Make report generation the action's only runtime publishing contract.
- Write both the machine-readable JSON report and the comment-ready Markdown report.
- Remove the built-in GitHub comments API call path and the token input it requires.
- Provide README recipes that let users post the generated Markdown comment body.
- Show both a simple same-repository PR recipe and a public fork-safe two-workflow recipe.
- Keep Markdown rendering inside the action so users do not need to copy renderer code into workflows.

**Non-Goals:**

- Add budget, threshold, or status-check enforcement.
- Add a second action mode, CLI, or reusable renderer package.
- Build the target project inside the action.
- Guarantee comment posting from a `pull_request` workflow that GitHub has intentionally restricted to read-only permissions.

## Decisions

### Remove Runtime Comment Posting

The action should stop accepting `comment-pr` and `github-token`, and `run()` should stop invoking the PR comment upsert path. This keeps the action focused on comparison and report generation.

Alternative considered: keep `comment-pr` for same-repository PRs and document a separate fork-safe pattern. That preserves convenience but keeps token handling, API behavior, and fork warning complexity inside a comparison action.

### Generate Markdown Beside JSON

The action should write a Markdown report file alongside the JSON report. The Markdown report should be the same body that the previous built-in PR comment path rendered, including the stable marker used for comment upserts.

Alternative considered: document a copy-pasteable `actions/github-script` renderer that reads JSON. That keeps the trusted workflow responsible for rendering, but it is too cumbersome for users and creates drift risk between the action renderer and documentation snippets.

### Add A Configurable Markdown Output Path

Add `markdown-output-file` with a default such as `bundle-size-comparison.md`, and add a `markdown-file` action output with the absolute path. This mirrors the existing JSON report path behavior and lets workflows upload or read the Markdown file directly.

Alternative considered: always derive the Markdown path from `output-file`. A separate input is clearer and avoids surprising users who intentionally place JSON reports in a machine-readable reports directory.

### Document Two Workflow Patterns

The documentation should distinguish two cases:

- Same-repository PRs: run comparison and post/update the generated Markdown file in a later step of the same workflow.
- Public fork PRs: run comparison in `pull_request`, upload the Markdown report as an artifact, then use `workflow_run` in the base repository context to download the artifact, verify the PR/head SHA context, and post/update it.

Alternative considered: recommend `pull_request_target`. That event has write permission for fork PRs, but it is unsafe for this use case if the workflow checks out, installs, or builds pull-request-controlled code.

### Keep Comment Shape Stable In Generated Markdown

The generated Markdown should preserve the existing comment marker, tables, status thresholds, bytes formatting, release stream wording, and historical details section. The renderer remains testable while all GitHub API posting behavior is removed.

Alternative considered: simplify the documented comment. That would make the recipe shorter, but it would make migration harder for existing users and would not satisfy the goal of producing the same comment.

## Risks / Trade-offs

- Breaking input removal may surprise users using `comment-pr` today -> Document a clear migration path and call out the replacement recipes near the input table.
- Generated Markdown drift from current formatting -> Keep renderer semantics covered by tests.
- Public fork recipe complexity -> Provide the simple same-repo recipe first, then clearly explain why fork-safe commenting requires `workflow_run`.
- Stale workflow runs may update a PR comment after a newer run -> The fork-safe recipe should include PR/head SHA validation guidance before posting.
- Markdown artifacts are untrusted when produced by fork code -> The action renderer escapes report-derived file paths, and docs should still advise using trusted action refs and validating PR/head SHA before posting artifacts from `workflow_run`.

## Migration Plan

1. Remove the action inputs and runtime comment API call path.
2. Preserve JSON report output and existing numeric outputs unchanged.
3. Add Markdown report output and a `markdown-file` action output.
4. Replace README `comment-pr` examples with external commenting recipes that post the generated Markdown.
5. Update security and contributor docs to describe comment publishing as workflow-owned integration code.
6. Rebuild `dist/index.js` with the runtime changes.

Rollback is straightforward: restore the previous `comment-pr` and `github-token` inputs plus the PR comment upsert path if built-in posting is needed again.

## Open Questions

- Should the README provide a full fork-safe `workflow_run` example, or a focused excerpt that links the artifact handoff pieces together?
