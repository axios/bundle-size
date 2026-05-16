## 1. Inputs And Configuration

- [ ] 1.1 Add optional `comment-pr` input defaulting to false.
- [ ] 1.2 Add optional `github-token` input used when PR commenting is enabled.
- [ ] 1.3 Validate that `github-token` is present when `comment-pr` is enabled.
- [ ] 1.4 Preserve current behavior when `comment-pr` is omitted or false.

## 2. Markdown Comment Rendering

- [ ] 2.1 Add a focused module for rendering bundle-size Markdown comments from `ComparisonReport`.
- [ ] 2.2 Render per-file rows with baseline gzip size, current gzip size, byte delta, percent delta, and status emoji.
- [ ] 2.3 Render a total row using the report totals.
- [ ] 2.4 Format byte counts in human-readable units while preserving exact bytes in the JSON report.
- [ ] 2.5 Include a stable hidden marker so future runs can find the existing comment.
- [ ] 2.6 Map percent deltas to status emoji using the fixed white/green/blue/yellow/orange/red scale.

## 3. GitHub PR Comment API

- [ ] 3.1 Detect the pull request number from the GitHub Actions event payload.
- [ ] 3.2 Skip commenting with an informational log when the action is not running for a pull request.
- [ ] 3.3 List existing PR issue comments and find the bundle-size comment marker.
- [ ] 3.4 Update the existing marked comment when present.
- [ ] 3.5 Create a new comment when no marked comment exists.
- [ ] 3.6 Surface GitHub API errors clearly, especially missing or insufficient token permissions.

## 4. Documentation And Verification

- [ ] 4.1 Update `action.yml` inputs for PR comment support.
- [ ] 4.2 Update README usage examples with `comment-pr`, `github-token`, and required workflow permissions.
- [ ] 4.3 Add tests for input validation, Markdown rendering, status color thresholds, PR event detection, comment update, and comment creation.
- [ ] 4.4 Run `pnpm test`.
- [ ] 4.5 Run `pnpm run build` and commit the updated `dist/index.js` with source changes.
