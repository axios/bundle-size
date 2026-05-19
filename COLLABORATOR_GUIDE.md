# Collaborator Guide

This guide is for maintainers and collaborators with repository access. For general contribution instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md). For private vulnerability handling, see [SECURITY.md](./SECURITY.md). For security design context, see [THREAT_MODEL.md](./THREAT_MODEL.md).

## Expectations

- Follow and help enforce the [Code of Conduct](./CODE_OF_CONDUCT.md).
- Keep reviews factual, respectful, and focused on project quality.
- Prefer small, focused changes over broad rewrites.
- Protect the GitHub Action runtime surface. Users execute `dist/index.js`, not `src/` directly.
- Do not merge red CI unless the failure is clearly unrelated and documented.

## Project Priorities

- Correct bundle-size comparison results.
- Safe path handling for configured files and reports.
- Safe handling of untrusted tarball contents.
- Minimal runtime dependency footprint.
- Clear machine-readable JSON reports.
- Committed `dist/` output that matches reviewed source.
- Least-privilege GitHub workflow permissions.

## Reviewing Pull Requests

Before approving a PR, check that it includes:

- A clear summary of what changed and why.
- Tests for behavior changes, or a convincing explanation when tests do not apply.
- Documentation updates for changed inputs, outputs, workflows, reports, or security expectations.
- Updated OpenSpec artifacts when the change modifies scoped behavior.
- Updated `dist/index.js` when runtime source, dependencies, action metadata, or generated output changed.
- Passing `pnpm test` and, when needed, `pnpm run build`.

Review `dist/index.js` with source changes. The bundled diff is large, but collaborators should still verify that it corresponds to the TypeScript changes and does not introduce unrelated runtime behavior.

## Security-Sensitive Reviews

Give extra scrutiny to changes involving:

- `src/paths.ts` path normalization or containment checks.
- `src/tarball.ts` archive download, decompression, parsing, entry type handling, or file lookup behavior.
- `src/report.ts` report output paths and report contents.
- `src/comment.ts` Markdown rendering and escaping used by documentation examples.
- `action.yml` inputs, outputs, runtime version, or entrypoint.
- Workflow permissions, third-party actions, or dependency updates.

Security-sensitive PRs should include focused regression tests. If a test is not practical, require a written explanation in the PR.

## Triage

For issues and discussions:

- Ask for a minimal reproduction when behavior is unclear.
- Confirm the action inputs, workflow permissions, Node version, and relevant artifact paths.
- Distinguish action bugs from caller workflow build problems.
- Keep unsupported feature requests open only when they fit the project direction.
- Close issues that are duplicates, out of scope, or cannot be reproduced after reasonable follow-up.

This action compares already-built files. If a report is wrong, first verify the configured `path`, `files`, `package-name`, and `output-file` values before assuming comparison logic is faulty.

## Security Reports

If someone reports a suspected vulnerability publicly:

- Do not discuss exploit details in the public thread.
- Point them to [SECURITY.md](./SECURITY.md).
- Move the discussion to a private advisory or private disclosure channel.
- Preserve enough public context for transparency without revealing exploit steps.

When coordinating a fix, keep the patch focused, add regression tests, update `dist/index.js`, and publish advisory details only after a mitigation is available.

## Dependencies And Tooling

- Keep runtime dependencies minimal. New runtime dependencies require clear justification.
- Review Dependabot PRs like any other code change.
- Verify lockfile changes are expected.
- Keep GitHub Actions pinned by commit SHA in workflows.
- Keep workflow permissions as narrow as possible.

For runtime dependency changes, run:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

## OpenSpec Maintenance

Use OpenSpec for meaningful behavior changes.

- Confirm active changes under `openspec/changes/<name>/` have proposal, tasks, and spec deltas as appropriate.
- Keep task lists accurate as implementation progresses.
- Ensure accepted behavior is reflected in `openspec/specs/` when archiving a completed change.
- Do not let stale OpenSpec changes linger without an owner or next step.

Small documentation fixes, dependency maintenance, and test-only cleanups usually do not need a new OpenSpec change.

## Merge Guidance

Before merging:

- Confirm required checks pass.
- Confirm review requirements are satisfied.
- Confirm the PR title follows Conventional Commit style when possible.
- Confirm docs, tests, OpenSpec, and `dist/` are updated when required.
- Confirm no unrelated files, secrets, local artifacts, or generated junk are included.

Prefer squash merges or focused commits according to the repository's current GitHub settings. If the PR contains unrelated work, ask the contributor to split it before merge.

## Release And Runtime Notes

Because this repository is a GitHub Action, the runtime artifact is part of the reviewed code. A source-only fix is incomplete when it changes runtime behavior.

When preparing release or branch updates:

- Verify `action.yml` points to the intended bundled entrypoint.
- Verify `dist/index.js` was rebuilt from the current source.
- Verify README examples still match supported inputs and permissions.
- Prefer immutable `https:` baseline tarball URLs in examples and workflows.

If unsure whether a change affects runtime behavior, require `pnpm run build` and include the resulting `dist/` changes.
