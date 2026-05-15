# AGENTS.md

Guidance for agents working in this repository.

## Project Shape

This repo is a TypeScript GitHub Action for comparing bundle sizes. The action runs from the committed `dist/index.js` bundle, not directly from `src/`.

Core behavior today:

- Accepts a `tarball-uri` baseline archive.
- Accepts newline-delimited `files` to compare.
- Resolves local files under `path`.
- Resolves tarball files relative to the archive root, stripping a single shared top-level directory such as `package/`.
- Measures gzip-compressed byte size.
- Writes a JSON comparison report.
- Does not enforce budgets, thresholds, or target sizes.

## Source Layout

Keep `src/index.ts` thin. It should remain the bootstrap/re-export surface, not the place where all logic accumulates.

Current modules:

- `src/action.ts`: orchestrates the GitHub Action run and action outputs.
- `src/config.ts`: reads and validates `@actions/core` inputs.
- `src/paths.ts`: normalizes configured paths and prevents path traversal.
- `src/tarball.ts`: downloads tarballs and extracts regular files from `.tar.gz` archives.
- `src/comparison.ts`: computes gzip sizes and per-file/totals deltas.
- `src/report.ts`: writes the JSON comparison report.
- `src/types.ts`: shared data types.
- `src/index.ts`: invokes `run()` when executed and re-exports testable helpers.

Prefer extending these focused modules over reintroducing a large single entrypoint.

## Build And Test Commands

Use PNPM. The package manager is pinned in `package.json`.

- `pnpm install --frozen-lockfile`: install dependencies in CI or a fresh checkout.
- `pnpm run lint`: TypeScript type-check only.
- `pnpm test`: compile TypeScript and run Node tests.
- `pnpm run build`: compile and bundle the action into `dist/`.
- `pnpm run clean`: remove compiled and bundled artifacts.

Always run `pnpm test` after behavior changes. Always run `pnpm run build` before finishing changes that affect runtime code, dependencies, action metadata, or generated output. Commit updated `dist/index.js` with source changes because GitHub Actions executes from `dist/index.js`.

## Runtime Constraints

- The action uses Node 20.
- Runtime dependencies should stay small. Prefer Node built-ins when they are clear and maintainable.
- Do not assume the caller has installed dependencies at action runtime.
- Do not build the target project inside the action; workflows should build artifacts before invoking this action.
- Treat missing configured files as errors. A comparison report should only be produced from trustworthy inputs.

## Tarball And Path Handling

Configured file paths are user-facing paths, not archive-internal paths. For npm-style tarballs, callers should write paths like `dist/axios.min.js`, not `package/dist/axios.min.js`.

Path rules:

- Normalize backslashes to POSIX-style `/` for configured paths and tar entries.
- Reject absolute paths and `..` traversal.
- Resolve local files inside the configured `path` root only.
- When all tarball files share one top-level directory, expose both the original tar entry path and the stripped path in the lookup map.

## Gzip Size Semantics

Gzip size is the canonical metric for the current capability. Measure gzip from the file bytes; do not assume files are already compressed. Report raw gzip byte counts and calculate deltas from those counts.

The report shape should remain machine-readable JSON first. Markdown summaries, PR comments, artifact uploads, and threshold enforcement are separate future capabilities.

## Testing Guidance

Tests live in `tests/` and run against compiled `lib/` files, so `pnpm test` compiles first.

Cover these behaviors when changing comparison logic:

- Input path parsing and rejection of unsafe paths.
- Tarball extraction and package-root stripping.
- Missing baseline/local file failures with useful error messages.
- Gzip size and delta report structure.
- Output path safety for generated reports.

Prefer small direct tests for individual modules over end-to-end tests that require network access.

## OpenSpec Workflow

This repo uses OpenSpec for scoped changes.

- Active changes live under `openspec/changes/<name>/`.
- Archived changes live under `openspec/changes/archive/YYYY-MM-DD-<name>/`.
- Main specs live under `openspec/specs/`.

When implementing a spec-driven change, read proposal, design, specs, and tasks before editing. Mark tasks complete as they are implemented. If a change introduces or modifies requirements, sync the delta spec into `openspec/specs/` before archiving.

The current tarball gzip behavior is captured in `openspec/specs/tarball-gzip-comparison/spec.md`.

## Workflow Lessons Learned

- Keep action code modular early. A single `index.ts` becomes difficult to review once config parsing, tarball handling, path safety, gzip measurement, reporting, and GitHub outputs are all mixed together.
- Preserve `path` as the local project root. New inputs should not overload it.
- Treat the tarball URI as an explicit baseline contract. Do not add package-manager shorthand such as `npm:axios@latest` unless a spec/proposal calls for registry resolution.
- Build comparison files on PRs from already-built local artifacts. On GitHub pull requests, the checkout/build represents the merge result when using the default PR merge ref.
- Avoid target-size enforcement in the current capability. Reporting and enforcing are different product behaviors and should remain separate changes.
- Keep `dist/` synchronized with `src/`; otherwise the committed action will not match the reviewed TypeScript.
