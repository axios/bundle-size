# Threat Model

## Scope

This threat model covers the `axios/bundle-size` GitHub Action in this repository. The action compares gzip sizes for local build artifacts against matching files from npm release tarball baselines, writes JSON and Markdown reports, and exposes GitHub Action outputs.

The runtime entrypoint is the committed `dist/index.js` bundle referenced by `action.yml`. The TypeScript source under `src/` is the reviewed source of truth, but GitHub Actions executes `dist/index.js` directly.

Out of scope:

- Building the caller's project before this action runs.
- Enforcing bundle-size budgets or blocking releases based on size changes.
- Uploading artifacts outside the reports written into the workspace.
- Securing arbitrary workflow steps before or after this action.

## System Overview

The action accepts these trust-relevant inputs:

- `path`: local project root containing already-built artifacts.
- `package-name`: npm package whose release tarballs provide baselines.
- `files`: newline-delimited artifact paths to compare.
- `output-file`: report path relative to `path`.
- `markdown-output-file`: Markdown report path relative to `path`.

Primary data flow:

1. Read and validate action inputs.
2. Fetch npm registry metadata for `package-name` with `fetch`.
3. Select the latest release and up to 10 previous stable releases.
4. Download selected release tarballs with `fetch`.
5. Gunzip and parse regular files from each tar archive into memory.
6. Normalize configured paths and resolve local files under `path`.
7. Gzip local and baseline file bytes and calculate deltas.
8. Write JSON and Markdown reports under `path`.
9. Set action outputs.

## Assets

- Integrity of the comparison report and action outputs.
- Availability of the CI job running the action.
- Integrity of the checked-out workspace, especially files outside the configured project root.
- Integrity of the committed `dist/index.js` action bundle.

## Trust Boundaries

- Workflow configuration to action inputs: repository maintainers control normal workflow inputs, but pull request changes may alter workflows in some repository setups.
- External network to runner: npm metadata and release tarball downloads return untrusted bytes from the npm registry and tarball endpoints.
- Tarball contents to parser: archive headers, paths, sizes, and file contents are attacker-controlled if the baseline source is compromised or misconfigured.
- Workspace to action: local build artifacts may be produced from untrusted pull request code.
- Action report to caller workflow: downstream workflow steps may read the generated reports and publish them elsewhere, including pull request comments.
- Source to runtime bundle: reviewers inspect `src/`, while users execute `dist/index.js`.

## Threat Actors

- Malicious pull request author who can change source code, build artifacts, or possibly workflow files depending on repository policy.
- Attacker controlling or intercepting npm metadata or baseline tarball endpoints.
- Compromised dependency or action used in this repository's CI workflow.
- Maintainer accidentally configuring broad token permissions, unsafe paths, or the wrong npm package baseline.

## Security Controls In Place

- Release tarball URLs from npm metadata must use `http:` or `https:`.
- Configured file paths reject absolute paths, Windows drive paths, UNC-like paths, empty paths, and `..` traversal.
- Local artifact reads and report writes are resolved through `resolveInsideRoot()` to keep them under `path`.
- Tarball entries are parsed in memory as regular files only; entries are not extracted to disk, so tar path traversal and symlink entries cannot overwrite workspace files.
- Tarball entry paths are normalized and a single shared package root such as `package/` is stripped only for lookup convenience.
- Missing local or latest baseline files fail the action; missing previous-release files are marked as incomplete historical comparisons.
- The action does not consume GitHub comment tokens or call the GitHub comments API.
- The action Markdown renderer escapes Markdown table separators, backslashes, and code span backticks for report-derived file paths.
- Repository workflows use reduced permissions, and most third-party GitHub Actions are pinned by commit SHA (the test reporter step is currently version-tagged).
- Dependabot updates npm and GitHub Actions dependencies.
- A zizmor workflow scans GitHub Actions configuration.

## Threats And Mitigations

| Threat | Impact | Existing Mitigation | Residual Risk / Recommendation |
|---|---|---|---|
| Malicious `files`, `output-file`, or `markdown-output-file` escapes the workspace root | Read or overwrite files outside the intended project tree | Path normalization rejects absolute and traversal paths; final resolution checks containment under `path` | Continue testing path handling across POSIX, Windows-like, and backslash inputs |
| Malicious tarball attempts path traversal or symlink overwrite | Workspace overwrite or unexpected file selection | Tar entries are never written to disk; only regular file contents are stored in memory | Continue ignoring non-regular entries; avoid future disk extraction unless using hardened extraction rules |
| Malicious tarball causes memory or CPU exhaustion | CI job denial of service | Tar size fields are validated as safe integers and truncated entries fail | No hard byte, file count, decompressed size, or fetch timeout limit exists; consider configurable limits if the action will process untrusted baselines |
| Malicious or compromised npm metadata changes comparison results | Misleading report or downstream comment | The action resolves releases from npm metadata and failed downloads fail the action | Prefer the public npm registry for public packages; consider integrity verification if future requirements need stronger supply-chain guarantees |
| HTTP release tarball URI is intercepted or modified | Misleading report or denial of service | Non-HTTP(S) protocols are rejected | `http:` tarball URLs from metadata are currently allowed; consider rejecting plain HTTP if compatibility allows |
| Downstream PR comment workflow grants excessive permissions | Token misuse impact if external workflow code is compromised | README examples scope comment publishing to workflow-owned steps and keep report generation at `contents: read` | Keep comment workflows minimal; prefer `pull-requests: write` or `issues: write` over broader permissions |
| Downstream workflow posts Markdown from an untrusted PR run | Misleading PR comment formatting or hidden content | The action renderer escapes report-derived file paths before writing Markdown | Treat artifacts from fork workflows as untrusted input; use trusted action refs and verify PR/head SHA before posting |
| Markdown injection through compared file paths | Misleading downstream comment formatting or hidden content | The action renderer escapes table separators, backslashes, and code span backticks | Continue treating rendered file paths as untrusted text |
| Report includes absolute `localRoot` path | Runner path disclosure | Report is intended as local CI output and action output exposes report path | If reports become public artifacts, consider omitting or relativizing `localRoot` |
| Runtime bundle diverges from reviewed source | Users execute unreviewed or stale code | Build guidance requires committing updated `dist/`; tests run against source modules | Review `dist/index.js` diffs with source changes; consider CI that verifies `dist/` is current |
| Dependency compromise | Arbitrary code execution during development/build or bundled runtime compromise | Runtime dependency footprint is small; lockfile is committed; Dependabot is enabled | Keep dependencies minimal, review dependency updates, and rebuild `dist/` from trusted environments |
| Workflow compromise through third-party actions | CI token or workspace compromise | Actions are pinned by SHA and `persist-credentials: false` is used for checkout | Continue pinning actions and running workflow security scanning |

## Secure Usage Guidance

- Configure the intended npm `package-name` and review reports for the resolved latest release version.
- Keep workflow permissions minimal. Report generation requires only the permissions needed to checkout and build the project, usually `contents: read`.
- Publish pull request comments outside this action from the generated Markdown report. For public fork PRs, use a trusted `workflow_run` workflow and do not execute pull-request-controlled code with writable credentials.
- Build artifacts in an explicit step before invoking this action; this action should only compare files, not run arbitrary project build logic.
- Keep `files`, `output-file`, and `markdown-output-file` relative to `path` and avoid including generated files that may contain secrets.
- Review both `src/` and `dist/index.js` when accepting changes to this action.

## Security Test Coverage Expectations

Changes to security-sensitive behavior should include tests for:

- Rejection of unsafe configured paths and report output paths.
- Missing local and baseline file failures.
- Tarball parsing behavior for package-root stripping, malformed archives, truncated entries, and non-regular entries.
- Documented comment rendering escaping for file paths containing Markdown-sensitive characters.
- Workflow recipes that publish comments from reports generated by public fork pull requests.
