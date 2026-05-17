## Context

The repository is a TypeScript GitHub Action executed from committed `dist/index.js` with Node 24. The current development pipeline compiles `src/` to `lib/` with `tsc`, bundles `lib/index.js` with `@vercel/ncc`, and runs JavaScript tests against the compiled `lib/` files.

The desired toolchain removes that intermediate output and aligns build, test, and import resolution around Vite-compatible semantics. Source and tests should be able to import project modules with `@/` aliases and without explicit `.js` or `.ts` extensions. The action must still ship as a committed `dist/index.js` bundle that includes runtime dependencies needed by GitHub Actions.

## Goals / Non-Goals

**Goals:**

- Bundle the action with Vite `8.0.10` directly from `src/index.ts` to `dist/index.js`.
- Run TypeScript tests with Vitest `4.1.6` against source modules instead of compiled `lib/` modules.
- Add Oxlint `1.65.0` as the repository lint command.
- Configure TypeScript, Vite, and Vitest so `@/` aliases and extensionless project imports work consistently.
- Keep semantic type checking with `tsc --noEmit`.
- Remove `@vercel/ncc`, the normal `lib/` output, and `dist/licenses.txt`.
- Preserve the action's current runtime behavior, inputs, outputs, and report semantics.

**Non-Goals:**

- Changing bundle-size comparison behavior, PR comment behavior, tarball resolution, or report shape.
- Adding threshold enforcement, artifact uploads, package-manager URI shorthand, or caller project build orchestration.
- Producing a replacement third-party license file in `dist/`.

## Decisions

1. Use Vite as the only runtime bundler.

   Vite should build `src/index.ts` directly into `dist/index.js` for the Node 24 GitHub Actions runtime. Node built-ins such as `node:fs`, `node:path`, and `node:zlib` should remain external, while runtime package dependencies such as `@actions/core` must be included in the committed bundle so action consumers do not need an install step.

   Alternative considered: keep `tsc` emitting `lib/` and point Vite at `lib/index.js`. That keeps an unnecessary build stage and does not solve the source/test import model cleanly.

2. Keep `tsc --noEmit` as an explicit type-checking step.

   Vite transpiles TypeScript but does not perform full semantic type checking during normal builds. The repository should separate fast bundling from type safety by adding or retaining a `typecheck` command that runs `tsc --noEmit`.

   Alternative considered: rely on Vite alone. That would miss TypeScript errors that do not block transpilation.

3. Use `moduleResolution: "Bundler"` with `baseUrl`/`paths` for project imports.

   The desired extensionless imports and `@/` aliases are bundler-resolution features, not native Node ESM behavior. TypeScript should model the environment that Vite and Vitest actually provide.

   Alternative considered: preserve `NodeNext`. That would continue requiring `.js` suffixes in ESM TypeScript and would not match the requested import style.

4. Use Vitest for TypeScript tests.

   Vitest shares Vite's resolution model, which makes TypeScript tests, `@/` aliases, and extensionless imports straightforward. Tests should import source modules such as `@/action` instead of compiled files under `../lib/`.

   Alternative considered: keep Node's built-in test runner with a TypeScript loader or runtime alias resolver. That would add custom runtime resolution complexity and drift from the Vite build configuration.

5. Treat Oxlint and TypeScript as separate validation layers.

   `pnpm run lint` should run Oxlint. Type checking should move to a dedicated `pnpm run typecheck` command, and CI/test workflows should run both as part of validation.

   Alternative considered: keep `lint` as `tsc --noEmit`. That would not add linting semantics and would make the requested Oxlint integration ambiguous.

## Risks / Trade-offs

- Vite may emit a bundle with different module wrapping than `ncc` → verify `node dist/index.js` can execute as the action entrypoint and that existing action tests still pass.
- Runtime dependencies could be accidentally externalized → configure bundling so non-built-in runtime dependencies are included in `dist/index.js` and inspect/build-test the generated artifact.
- Vitest globals or mocking semantics may differ from `node:test` → migrate tests conservatively, prefer explicit imports from `vitest`, and preserve existing deterministic network mocking.
- `moduleResolution: "Bundler"` no longer models direct Node execution of unbundled source → keep source execution behind Vite/Vitest and keep the GitHub Action runtime pointed at the bundled `dist/index.js`.
- Removing `dist/licenses.txt` removes a generated license notice artifact → document that the Vite-built action artifact no longer includes that file and accept this as an explicit product decision.
