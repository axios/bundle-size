## 1. Tooling Dependencies And Scripts

- [x] 1.1 Add Vite `8.0.10`, Vitest `4.1.6`, and Oxlint `1.65.0` as development dependencies.
- [x] 1.2 Remove `@vercel/ncc` from development dependencies and update the lockfile.
- [x] 1.3 Update package scripts so `lint` runs Oxlint, `typecheck` runs `tsc --noEmit`, `test` runs Vitest, and `build` runs Vite.
- [x] 1.4 Update `clean` to remove generated Vite output and no longer assume a required `lib/` output.

## 2. Vite, Vitest, And TypeScript Configuration

- [x] 2.1 Add Vite configuration that bundles `src/index.ts` to `dist/index.js` for the Node 24 action runtime.
- [x] 2.2 Configure Vite to keep Node built-ins external while bundling runtime package dependencies needed by action consumers.
- [x] 2.3 Add Vitest configuration for TypeScript tests under `tests/**/*.test.ts`.
- [x] 2.4 Update TypeScript configuration for bundler-style module resolution, no-emission type checking, and `@/*` path aliases.
- [x] 2.5 Ensure source and test configuration supports extensionless project imports.

## 3. Source And Test Migration

- [x] 3.1 Convert source module imports from extensionful relative specifiers to extensionless `@/` aliases where appropriate.
- [x] 3.2 Convert all JavaScript tests under `tests/` to TypeScript test files.
- [x] 3.3 Replace `node:test` usage with Vitest imports while preserving existing assertions and deterministic network mocking.
- [x] 3.4 Update tests to import source modules through `@/` aliases instead of compiled files under `../lib/`.
- [x] 3.5 Preserve module-aligned coverage for paths, config, tarball, comparison, report, comment, PR comment, action orchestration, and runtime toolchain behavior.

## 4. Generated Artifacts And Documentation

- [x] 4.1 Build the action bundle with Vite and commit the updated `dist/index.js` output.
- [x] 4.2 Remove `dist/licenses.txt` because the Vite-built action artifact no longer requires it.
- [x] 4.3 Update README build/tooling documentation to describe Vite, Vitest, Oxlint, `typecheck`, and the absence of a normal `lib/` workflow.
- [x] 4.4 Update repository agent guidance to reflect TypeScript tests through Vitest and Vite-built `dist/index.js`.

## 5. Verification

- [x] 5.1 Run `pnpm run lint` and fix reported lint issues.
- [x] 5.2 Run `pnpm run typecheck` and fix TypeScript errors.
- [x] 5.3 Run `pnpm test` and confirm the migrated TypeScript test suite passes.
- [x] 5.4 Run `pnpm run build` and confirm `dist/index.js` is synchronized with source.
- [x] 5.5 Inspect package scripts and generated output to confirm `ncc`, normal `lib/` output, and `dist/licenses.txt` are no longer required.
