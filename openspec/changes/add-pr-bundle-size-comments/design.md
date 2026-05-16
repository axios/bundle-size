## Context

The action currently downloads a tarball baseline, compares configured local build artifacts against matching tarball files, measures gzip byte sizes, writes a JSON report, and sets outputs. Reviewers must inspect the JSON file or workflow logs to understand bundle-size impact.

The desired workflow is for pull requests to receive a stable bot comment that summarizes the same comparison data in a Markdown table.

```text
buildComparisonReport()
      │
      ├─ write JSON report
      ├─ set outputs
      └─ when PR comments are enabled
             │
             ├─ render Markdown summary
             ├─ find existing bundle-size comment
             └─ update existing comment or create a new one
```

## Goals / Non-Goals

**Goals:**

- Make bundle-size differences visible directly on pull requests.
- Keep commenting opt-in so existing users do not need new permissions.
- Avoid duplicate comments by updating an existing action comment when present.
- Present per-file and total gzip-size deltas in a readable Markdown table.
- Add a status column with colored circle emoji derived from percent delta thresholds.
- Preserve the current machine-readable JSON report and outputs.

**Non-Goals:**

- Enforce bundle-size budgets or fail based on status color.
- Post comments on non-PR events.
- Upload artifacts or create GitHub Checks annotations.
- Support custom threshold expressions or user-defined color mappings in this change.
- Recommend `pull_request_target` as the default workflow event.

## Decisions

### Make PR Comments Opt-In

Add a boolean-style input such as `comment-pr`, defaulting to false. When disabled, the action behaves as it does today.

This avoids surprising existing workflows with new GitHub API calls or required write permissions.

### Accept A GitHub Token Input

Add a `github-token` input used only when PR commenting is enabled. Typical usage should be:

```yaml
permissions:
  contents: read
  pull-requests: write

steps:
  - uses: axios/bundle-size@main
    with:
      tarball-uri: 'https://registry.npmjs.org/axios/-/axios-1.6.8.tgz'
      files: |
        dist/axios.js
        dist/axios.min.js
      comment-pr: true
      github-token: ${{ github.token }}
```

If commenting is enabled and no token is provided, the action should fail with a configuration error because the requested behavior cannot be attempted.

### Comment Only On Pull Request Events

When commenting is enabled on a non-PR event, the action should skip comment creation and log an informational message. The comparison report should still be generated successfully.

This keeps the input safe for workflows that run on both `push` and `pull_request`.

### Update Existing Comments Using A Hidden Marker

The comment body should include a stable hidden marker, for example:

```md
<!-- axios-bundle-size-comment -->
```

The action should list existing comments on the PR, find a comment containing that marker, and update it. If none exists, it should create a new comment.

This keeps repeated workflow runs from spamming the PR conversation.

### Render A Markdown Table From The Existing Report

The comment should derive from the existing `ComparisonReport` data rather than recomputing sizes. It should include per-file rows and a total row.

Example shape:

```md
<!-- axios-bundle-size-comment -->

## Bundle Size Report

| File | Baseline gzip | Current gzip | Difference | Status |
|---|---:|---:|---:|:---:|
| `dist/axios.js` | 14.2 KiB | 14.6 KiB | +412 B (+2.83%) | 🔵 |
| `dist/axios.min.js` | 5.9 KiB | 5.8 KiB | -91 B (-1.51%) | 🟢 |
| **Total** | **20.1 KiB** | **20.4 KiB** | **+321 B (+1.56%)** | **🔵** |
```

### Use Fixed Percent Delta Status Colors

The `Status` column should use the following fixed severity scale:

| Percent Delta | Color | Emoji |
|---------------|-------|-------|
| `null` | white | ⚪ |
| `<= 1%` | green | 🟢 |
| `> 1%` and `<= 3%` | blue | 🔵 |
| `> 3%` and `<= 6%` | yellow | 🟡 |
| `> 6%` and `<= 9%` | orange | 🟠 |
| `> 9%` | red | 🔴 |

Negative deltas, zero deltas, and increases up to 1% are green. A `null` percent delta occurs when the baseline size is zero and should be shown as white because severity cannot be meaningfully calculated.

The status color is informational only and must not change whether the action succeeds.

### Prefer Built-In Fetch Over A Large Runtime Dependency

Node 20 provides `fetch`, and the action already uses it for tarball downloads. GitHub issue-comment calls can use the REST API directly with `fetch` and the provided token.

This avoids adding a runtime dependency solely for a small subset of GitHub API behavior. If REST handling becomes broader later, `@actions/github` can be reconsidered.

## Risks / Trade-offs

- Fork pull requests may receive a read-only token and GitHub can reject comment creation with `403`. The comparison report should still be available; implementation should surface the permission problem clearly.
- Direct GitHub REST calls require careful pagination or an adequate comments page size. Since only one marker comment is expected, listing recent issue comments with a reasonable page size is likely sufficient for the first version.
- Markdown comments are human-readable but not structured automation output. The JSON report remains the canonical machine-readable artifact.
- Emoji rendering varies slightly by client, but GitHub Markdown supports the selected colored circle emoji well enough for this purpose.
