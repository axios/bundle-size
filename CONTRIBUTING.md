# Contributing

Thanks for helping improve `axios/bundle-size`. This repository contains a TypeScript GitHub Action that compares gzip bundle sizes against a tarball baseline.

Please follow the [Code of Conduct](./CODE_OF_CONDUCT.md) when participating in this project.

## Development Setup

Use the package manager pinned in `package.json`.

```bash
pnpm install --frozen-lockfile
```

Useful commands:

```bash
pnpm run lint
pnpm test
pnpm run build
pnpm run clean
```

`pnpm test` runs the TypeScript tests with Vitest against the source modules. `pnpm run build` compiles and bundles the action into `dist/`.

## Project Structure

- `action.yml`: GitHub Action metadata and runtime entrypoint.
- `src/`: TypeScript source.
- `tests/`: TypeScript tests that run with Vitest against source modules.
- `dist/`: committed action bundle executed by GitHub Actions.
- `openspec/`: requirements and change proposals.

Keep `src/index.ts` thin. Prefer focused modules for behavior:

- `src/action.ts`: action orchestration and outputs.
- `src/config.ts`: action input parsing and validation.
- `src/paths.ts`: path normalization and traversal protection.
- `src/tarball.ts`: tarball download and parsing.
- `src/comparison.ts`: gzip size calculation and report construction.
- `src/report.ts`: JSON report writing.
- `src/comment.ts` and `src/pr-comment.ts`: optional pull request comments.

## Making Changes

- Keep changes small and focused.
- Add or update tests for behavior changes.
- Preserve the JSON report as machine-readable output.
- Treat configured paths, tarball contents, and pull request input as untrusted.
- Avoid new runtime dependencies unless there is a clear need.
- Do not make the action build the caller's project; workflows should build artifacts before invoking this action.

Runtime changes must update the committed bundle:

```bash
pnpm run build
```

Commit `dist/index.js` with source changes that affect runtime behavior, dependencies, `action.yml`, or generated output. GitHub Actions runs `dist/index.js` directly and does not install or compile this project at action runtime.

## Tests

Run tests before opening a pull request:

```bash
pnpm test
```

Also run the build for changes that affect runtime code, dependencies, action metadata, or generated output:

```bash
pnpm run build
```

Prefer module-aligned tests. For example, changes in `src/tarball.ts` should usually be covered by `tests/tarball.test.ts`.

Security-sensitive changes should include tests for relevant edge cases, especially:

- Unsafe path rejection.
- Tarball path normalization and package-root stripping.
- Missing local or baseline files.
- Malformed or truncated tarball entries.
- Markdown escaping in pull request comments.
- Token permission failures when PR comments are enabled.

## OpenSpec Changes

This repository uses OpenSpec for scoped behavior changes.

- Active changes live under `openspec/changes/<name>/`.
- Main specs live under `openspec/specs/`.
- Archived changes live under `openspec/changes/archive/`.

For feature work or behavior changes, add or update the relevant OpenSpec proposal, design, tasks, and spec deltas before implementation when appropriate. Keep tasks updated as implementation progresses.

Documentation-only fixes and small maintenance changes may not need a new OpenSpec change.

## Security

Review [THREAT_MODEL.md](./THREAT_MODEL.md) before changing path handling, tarball parsing, report output, workflow permissions, dependency behavior, or pull request comments.

Important security expectations:

- Keep local reads and report writes inside the configured `path` root.
- Do not extract tarball entries to disk.
- Treat tarball bytes and tar entry metadata as untrusted.
- Keep `github-token` out of logs, reports, outputs, and comments.
- Prefer immutable `https:` baseline tarball URLs in examples and workflows.
- Keep GitHub workflow permissions minimal.

## Pull Requests

Use the pull request template and include:

- A summary of what changed and why.
- Tests run, or a clear explanation if tests do not apply.
- Documentation updates for changed behavior, inputs, outputs, or workflow usage.
- Updated `dist/index.js` when required.

Pull request titles and commits should use Conventional Commit style when possible, such as `fix:`, `feat:`, `docs:`, `test:`, or `chore:`.

At least one maintainer review is required before merge.
