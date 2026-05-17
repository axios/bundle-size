# Threat Model

## Scope

This threat model covers the `axios/bundle-size` GitHub Action in this repository. The action compares gzip sizes for local build artifacts against matching files from a configured `.tar.gz` baseline, writes a JSON report, exposes GitHub Action outputs, and can optionally post or update a pull request comment.

The runtime entrypoint is the committed `dist/index.js` bundle referenced by `action.yml`. The TypeScript source under `src/` is the reviewed source of truth, but GitHub Actions executes `dist/index.js` directly.

Out of scope:

- Building the caller's project before this action runs.
- Enforcing bundle-size budgets or blocking releases based on size changes.
- Uploading artifacts outside the JSON report written into the workspace.
- Securing arbitrary workflow steps before or after this action.

## System Overview

The action accepts these trust-relevant inputs:

- `path`: local project root containing already-built artifacts.
- `tarball-uri`: HTTP(S) URI for the baseline `.tar.gz` archive.
- `files`: newline-delimited artifact paths to compare.
- `output-file`: report path relative to `path`.
- `comment-pr`: whether to post or update a pull request comment.
- `github-token`: token used only when `comment-pr` is enabled.

Primary data flow:

1. Read and validate action inputs.
2. Download `tarball-uri` with `fetch`.
3. Gunzip and parse regular files from the tar archive into memory.
4. Normalize configured paths and resolve local files under `path`.
5. Gzip local and baseline file bytes and calculate deltas.
6. Write a JSON report under `path` at `output-file`.
7. Set action outputs.
8. If enabled and running for a pull request, call the GitHub comments API to update or create one comment identified by a hidden marker.

## Assets

- Integrity of the comparison report and action outputs.
- Confidentiality of the `github-token` input and default `GITHUB_TOKEN`.
- Integrity of pull request comments written by the action.
- Availability of the CI job running the action.
- Integrity of the checked-out workspace, especially files outside the configured project root.
- Integrity of the committed `dist/index.js` action bundle.

## Trust Boundaries

- Workflow configuration to action inputs: repository maintainers control normal workflow inputs, but pull request changes may alter workflows in some repository setups.
- External network to runner: `tarball-uri` downloads untrusted bytes from an external HTTP(S) endpoint.
- Tarball contents to parser: archive headers, paths, sizes, and file contents are attacker-controlled if the baseline source is compromised or misconfigured.
- Workspace to action: local build artifacts may be produced from untrusted pull request code.
- Action to GitHub API: PR commenting uses a token whose permissions are configured by the workflow and constrained by GitHub event rules.
- Source to runtime bundle: reviewers inspect `src/`, while users execute `dist/index.js`.

## Threat Actors

- Malicious pull request author who can change source code, build artifacts, or possibly workflow files depending on repository policy.
- Attacker controlling or intercepting the baseline tarball endpoint.
- Compromised dependency or action used in this repository's CI workflow.
- Maintainer accidentally configuring broad token permissions, unsafe paths, or untrusted baseline URLs.

## Security Controls In Place

- `tarball-uri` accepts only `http:` and `https:` URLs; other protocols are rejected.
- Configured file paths reject absolute paths, Windows drive paths, UNC-like paths, empty paths, and `..` traversal.
- Local artifact reads and JSON report writes are resolved through `resolveInsideRoot()` to keep them under `path`.
- Tarball entries are parsed in memory as regular files only; entries are not extracted to disk, so tar path traversal and symlink entries cannot overwrite workspace files.
- Tarball entry paths are normalized and a single shared package root such as `package/` is stripped only for lookup convenience.
- Missing local or baseline files fail the action instead of producing a partial report.
- PR commenting is opt-in and requires `github-token` when enabled.
- PR comments are skipped outside pull request events.
- Fork pull request token permission failures are downgraded to warnings so reporting still succeeds without requiring elevated token permissions.
- Markdown table file paths are escaped before rendering in PR comments.
- Repository workflows use reduced permissions, and most third-party GitHub Actions are pinned by commit SHA (the test reporter step is currently version-tagged).
- Dependabot updates npm and GitHub Actions dependencies.
- A zizmor workflow scans GitHub Actions configuration.

## Threats And Mitigations

| Threat | Impact | Existing Mitigation | Residual Risk / Recommendation |
|---|---|---|---|
| Malicious `files` or `output-file` escapes the workspace root | Read or overwrite files outside the intended project tree | Path normalization rejects absolute and traversal paths; final resolution checks containment under `path` | Continue testing path handling across POSIX, Windows-like, and backslash inputs |
| Malicious tarball attempts path traversal or symlink overwrite | Workspace overwrite or unexpected file selection | Tar entries are never written to disk; only regular file contents are stored in memory | Continue ignoring non-regular entries; avoid future disk extraction unless using hardened extraction rules |
| Malicious tarball causes memory or CPU exhaustion | CI job denial of service | Tar size fields are validated as safe integers and truncated entries fail | No hard byte, file count, decompressed size, or fetch timeout limit exists; consider configurable limits if the action will process untrusted baselines |
| Malicious or compromised baseline URL changes comparison results | Misleading report or PR comment | Workflow explicitly chooses the baseline URI; failed downloads fail the action | Prefer immutable, versioned HTTPS tarball URLs; avoid mutable `latest`-style URLs for release gates |
| HTTP baseline URI is intercepted or modified | Misleading report or denial of service | Non-HTTP(S) protocols are rejected | `http:` is currently allowed; prefer `https:` in workflows, and consider rejecting plain HTTP if compatibility allows |
| PR comment token has excessive permissions | Token misuse impact if later code is compromised | README example grants `contents: read` and `pull-requests: write`; workflows use least practical permissions | Keep `github-token` scoped to comment writing only; avoid personal access tokens unless required |
| Malicious PR attempts to exfiltrate `github-token` through comment content | Secret disclosure in PR comment | Current rendered comment includes size data and configured file paths, not token values | Keep token out of reports, logs, errors, and rendered comments; review future comment fields for secret exposure |
| Markdown injection through compared file paths | Misleading PR comment formatting or hidden content | Markdown table separators, backslashes, and code span backticks are escaped | Continue treating rendered file paths as untrusted text |
| Report includes absolute `localRoot` path | Runner path disclosure | Report is intended as local CI output and action output exposes report path | If reports become public artifacts, consider omitting or relativizing `localRoot` |
| Runtime bundle diverges from reviewed source | Users execute unreviewed or stale code | Build guidance requires committing updated `dist/`; tests run against source modules | Review `dist/index.js` diffs with source changes; consider CI that verifies `dist/` is current |
| Dependency compromise | Arbitrary code execution during development/build or bundled runtime compromise | Runtime dependency footprint is small; lockfile is committed; Dependabot is enabled | Keep dependencies minimal, review dependency updates, and rebuild `dist/` from trusted environments |
| Workflow compromise through third-party actions | CI token or workspace compromise | Actions are pinned by SHA and `persist-credentials: false` is used for checkout | Continue pinning actions and running workflow security scanning |

## Secure Usage Guidance

- Use immutable `https:` baseline tarball URLs when possible.
- Keep workflow permissions minimal. For JSON-only reports, `contents: read` is sufficient. For PR comments, add only the permission needed to write comments, such as `pull-requests: write` for this repository's workflow pattern.
- Pass `${{ github.token }}` rather than a long-lived personal access token unless GitHub's default token cannot satisfy the use case.
- Build artifacts in an explicit step before invoking this action; this action should only compare files, not run arbitrary project build logic.
- Keep `files` and `output-file` relative to `path` and avoid including generated files that may contain secrets.
- Review both `src/` and `dist/index.js` when accepting changes to this action.

## Security Test Coverage Expectations

Changes to security-sensitive behavior should include tests for:

- Rejection of unsafe configured paths and report output paths.
- Missing local and baseline file failures.
- Tarball parsing behavior for package-root stripping, malformed archives, truncated entries, and non-regular entries.
- PR comment rendering escaping for file paths containing Markdown-sensitive characters.
- PR comment behavior outside pull request events and when token permissions are insufficient.
