## 1. Toolchain Metadata

- [x] 1.1 Determine the exact stable pnpm 11 patch version to pin in `packageManager`.
- [x] 1.2 Update `action.yml` to use the Node 24 GitHub Actions runtime while keeping `dist/index.js` as the entrypoint.
- [x] 1.3 Update `package.json` engines and package-manager metadata to require Node 24 and pnpm 11.
- [x] 1.4 Refresh `pnpm-lock.yaml` with pnpm 11 and review the diff for unrelated dependency changes.

## 2. CI And Documentation

- [x] 2.1 Update `.github/workflows/bundle-size.yml` to set up Node 24 and pnpm 11 before install, build, and local action execution.
- [x] 2.2 Update `README.md` references for the action runtime, prerequisites, and any workflow examples that mention Node 20 or pnpm 9.

## 3. Tests And Generated Output

- [x] 3.1 Add or update tests that verify the action metadata and package manifest declare Node 24 and pnpm 11.
- [x] 3.2 Run `pnpm install --frozen-lockfile` with pnpm 11.
- [x] 3.3 Run `pnpm test` under Node 24 with pnpm 11.
- [x] 3.4 Run `pnpm run build` under Node 24 with pnpm 11 and commit any resulting `dist/` changes.

## 4. OpenSpec Completion

- [x] 4.1 Confirm `openspec status --change "upgrade-node-24-pnpm-11"` reports the change as ready after implementation tasks are complete.
