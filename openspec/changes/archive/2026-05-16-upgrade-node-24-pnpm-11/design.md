## Context

The repository currently targets the GitHub Actions `node20` runtime and declares pnpm 9 in `package.json`. The action is executed from committed `dist/index.js`, while local and CI verification compile TypeScript to `lib/` and bundle with `@vercel/ncc`.

This change is a coordinated toolchain migration, not a change to bundle-size comparison semantics. The implementation needs to keep runtime metadata, package-manager metadata, CI setup, documentation, lockfile format, tests, and the committed bundle aligned so users do not see different behavior between source review and action execution.

## Goals / Non-Goals

**Goals:**

- Run the GitHub Action with the Node 24 action runtime.
- Require Node 24 and pnpm 11 for repository development and CI verification.
- Regenerate dependency metadata with pnpm 11 without adding runtime dependencies.
- Keep the committed `dist/` bundle synchronized with source and metadata changes.
- Verify the existing test suite and build continue to pass under the upgraded toolchain.

**Non-Goals:**

- Do not alter bundle comparison inputs, outputs, gzip size calculations, tarball handling, or report shape.
- Do not add threshold enforcement, PR comments, package registry shorthand, artifact uploads, or build orchestration for target projects.
- Do not introduce new source modules or dependencies unless required by toolchain compatibility.

## Decisions

- Use `runs.using: node24` in `action.yml` rather than preserving `node20` compatibility. This matches the requested runtime and avoids maintaining a dual-runtime compatibility contract.
- Set `engines.node` to require Node 24 rather than a broad `>=20` range. A precise minimum prevents local installs and CI from passing on runtimes that differ from the action runtime.
- Pin `packageManager` to an exact pnpm 11 release and set `engines.pnpm` to require pnpm 11. `packageManager` gives Corepack and tooling a deterministic package-manager version, while the engine communicates the supported major version.
- Update CI setup to use Node 24 and pnpm 11 explicitly. This validates the same major versions the action and repository metadata require.
- Treat lockfile and `dist/` updates as generated artifacts that must be reviewed. If pnpm 11 changes lockfile metadata or ncc emits different output under Node 24, those outputs should be committed with the implementation.
- Keep tests focused on existing behavior. Since this migration should not change comparison logic, the main verification is `pnpm test` and `pnpm run build`; new runtime tests are only needed if source code changes become necessary for Node 24 compatibility.

## Risks / Trade-offs

- Node 24 action runtime availability may depend on GitHub Actions runner support -> document the breaking runtime requirement and rely on the action metadata to enforce it.
- pnpm 11 may rewrite `pnpm-lock.yaml` or enforce stricter dependency resolution -> regenerate with pnpm 11 and review the lockfile diff for dependency changes unrelated to the package-manager upgrade.
- Existing dependencies or build tooling may expose Node 24 compatibility issues -> run lint, tests, and build under Node 24; update dev dependencies only if needed for compatibility.
- Documentation can drift from metadata -> update README examples and prerequisites in the same change as `action.yml`, workflow, and manifest updates.
- Generated `dist/` may not change even after metadata updates -> still run the build and leave `dist/` unchanged if the generated output is identical.

## Migration Plan

1. Update action/runtime metadata and repository package-manager metadata.
2. Activate/install pnpm 11 and refresh `pnpm-lock.yaml` using the pinned package manager.
3. Update CI workflow and README references from Node 20/pnpm 9 to Node 24/pnpm 11.
4. Run `pnpm install --frozen-lockfile`, `pnpm test`, and `pnpm run build` under Node 24 with pnpm 11.
5. Commit any resulting `dist/` changes with the source, metadata, lockfile, docs, and OpenSpec updates.

Rollback is a normal revert of the metadata, lockfile, docs, workflow, and generated bundle changes back to the Node 20/pnpm 9 toolchain.

## Open Questions

- Which exact pnpm 11 patch version should be pinned in `packageManager`? The implementation should use the current stable pnpm 11 release available through Corepack or the package registry at implementation time.
