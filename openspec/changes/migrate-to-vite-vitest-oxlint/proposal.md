## Why

The repository's build and test tooling is still centered on an intermediate `lib/` output and `@vercel/ncc`, which makes source imports, tests, and bundling follow different resolution models. Migrating to Vite, Vitest, and Oxlint gives the project one bundler-aware toolchain for runtime bundling and TypeScript tests while keeping type checking explicit.

## What Changes

- Replace `@vercel/ncc` with Vite `8.0.10` for producing the committed GitHub Action bundle at `dist/index.js`.
- Remove the intermediate `lib/` build output from the normal build and test workflow.
- Add Oxlint `1.65.0` as the repository lint command.
- Add Vitest `4.1.6` and convert the test suite from JavaScript files to TypeScript files.
- Enable `@/` aliases for source and test imports.
- Allow extensionless local imports in source and tests through bundler-aware TypeScript/Vite/Vitest resolution.
- Preserve `tsc --noEmit` as the semantic type-checking step because Vite does not replace TypeScript type checking.
- Stop producing `dist/licenses.txt`; the built action artifact only needs the runnable `dist/index.js` bundle and supporting metadata required by Vite output.

Non-goals:

- Do not change action inputs, outputs, report structure, tarball handling, gzip comparison semantics, or PR comment behavior.
- Do not build caller project artifacts inside the action.
- Do not add threshold enforcement, package URI resolution, artifact uploads, or other bundle-size product capabilities.

## Capabilities

### New Capabilities
- `repository-linting`: Repository linting with Oxlint as a first-class validation command.

### Modified Capabilities
- `runtime-toolchain`: Build tooling changes from `tsc`-to-`lib` plus `ncc` bundling to Vite bundling directly from source while preserving Node 24, pnpm 11, and committed `dist/index.js` runtime execution.
- `source-test-suite`: Tests change from JavaScript files importing compiled `lib/` modules to TypeScript files run through Vitest against source modules with `@/` aliases.

## Impact

- Affects `package.json`, `pnpm-lock.yaml`, TypeScript configuration, new Vite/Vitest configuration, source imports, test files, README/tooling documentation, and generated `dist/` output.
- Removes the `@vercel/ncc` dev dependency and `dist/licenses.txt` artifact.
- Adds dev dependencies on Vite `8.0.10`, Vitest `4.1.6`, and Oxlint `1.65.0`.
- Requires updating OpenSpec main specs and repository guidance that currently describe `lib/`, `ncc`, and JavaScript tests against compiled output.
