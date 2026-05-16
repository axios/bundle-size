## Why

Pull request reviewers should be able to see bundle-size changes directly in the PR conversation without opening a generated JSON artifact or reading workflow logs. The action already computes trustworthy gzip-size deltas; posting a concise Markdown summary makes those results visible at the review point.

## What Changes

- Add optional PR comment support for successful bundle-size comparisons.
- Render a Markdown table with per-file and total gzip-size differences.
- Include a `Status` column using colored circle emoji based on the percent delta severity scale.
- Update an existing action-authored bundle-size comment instead of creating duplicate comments on every run.
- Keep JSON report generation and action outputs unchanged.
- Treat PR comments as presentation/reporting only: no size budget or threshold enforcement.

## Capabilities

### New Capabilities

- `pr-bundle-size-comment`: Post or update a pull request comment summarizing gzip-size comparison results.

### Modified Capabilities

- None.

## Impact

- Affects the GitHub Action input contract in `action.yml`.
- Affects runtime orchestration in `src/action.ts` and the bundled `dist/index.js`.
- Adds Markdown rendering and GitHub issue-comment API behavior.
- Requires workflow authors who enable comments to grant a token with pull request or issue comment write permission.
- Updates README and example workflow documentation to show PR comment usage and required permissions.
