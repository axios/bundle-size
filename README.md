# Bundle Size Action

A custom GitHub Action that checks and reports the bundle size of your project.

This is the **v0.1 "Hello World" foundation**. The scaffolding is production-ready and intentionally minimal so that real bundle-size analysis logic can be layered on top without any structural rework.

---

## Folder Structure

```
.
├── action.yml                    # GitHub Action metadata
├── package.json                  # Node project manifest (PNPM)
├── pnpm-lock.yaml                # Lockfile (committed)
├── tsconfig.json                 # TypeScript configuration
├── .gitignore
├── src/
│   └── index.ts                  # Action entrypoint ← add logic here
├── dist/
│   ├── index.js                  # Bundled action (committed, used at runtime)
│   └── licenses.txt              # Third-party licence notices
└── .github/
    └── workflows/
        └── bundle-size.yml       # Sample workflow that runs this action
```

> **`lib/`** is the intermediate TypeScript compilation output. It is *not* committed (see `.gitignore`).

---

## How It Works

1. **TypeScript** source lives in `src/`.
2. `pnpm run compile` (`tsc`) compiles `src/` → `lib/`.
3. `pnpm run bundle` (`@vercel/ncc`) bundles `lib/index.js` and all dependencies into a single self-contained `dist/index.js`.
4. `action.yml` points GitHub Actions at `dist/index.js` using the `node20` runner.
5. When the workflow runs, GitHub reads `action.yml`, resolves the `path` input, and executes `dist/index.js` — no separate `npm install` step is needed at runtime.

---

## Inputs

| Name   | Required | Default | Description                                              |
|--------|----------|---------|----------------------------------------------------------|
| `path` | No       | `.`     | Path to the project whose bundle size should be checked. |

## Outputs

| Name   | Description                                                           |
|--------|-----------------------------------------------------------------------|
| `size` | Total bundle size in bytes (placeholder until analysis is wired up). |

---

## Usage in a Workflow

```yaml
- name: Check Bundle Size
  uses: axios/bundle-size@main
  with:
    path: '.'
```

Because this repository *is* the action, a workflow inside the same repo can reference it with `./`:

```yaml
- uses: ./
  with:
    path: '.'
```

See [`.github/workflows/bundle-size.yml`](.github/workflows/bundle-size.yml) for a complete example.

---

## Build Instructions

### Prerequisites

- Node.js ≥ 20
- PNPM ≥ 9 — install with `npm install -g pnpm` if not already available

### Commands

```bash
# Install dependencies
pnpm install

# Type-check only (no output)
pnpm run lint

# Compile TypeScript → lib/
pnpm run compile

# Bundle lib/ → dist/  (what GitHub Actions executes)
pnpm run bundle

# Full build (compile + bundle)
pnpm run build

# Remove compiled and bundled artefacts
pnpm run clean
```

> **Important:** always commit the updated `dist/` after a `pnpm run build`. GitHub Actions executes directly from `dist/index.js` — it does *not* re-compile or re-install at runtime.

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/axios/bundle-size.git
cd bundle-size

# 2. Install dependencies
pnpm install

# 3. Edit the source
#    Open src/index.ts and make your changes.

# 4. Build
pnpm run build

# 5. Run locally (simulates the GitHub Actions runtime)
node dist/index.js
```

To simulate GitHub Actions inputs locally, set the corresponding environment variables before running:

```bash
INPUT_PATH="./my-project" node dist/index.js
```

---

## Where to Add Bundle-Size Logic

All future analysis code belongs in **`src/index.ts`** (or in helper modules imported from it). The `TODO` comment in that file marks the exact insertion point:

```ts
// TODO: add bundle-size analysis logic here.
// Suggested extension points:
//   - Build the project at `targetPath` and measure artifact sizes.
//   - Compare sizes against a stored baseline.
//   - Validate against a configurable threshold.
//   - Post a summary comment on the pull request.
//   - Upload a JSON size report as a workflow artifact.
//   - Support multiple bundlers (Vite, Webpack, Next.js, …).
```

Suggested next steps:

| Feature                          | Notes                                                       |
|----------------------------------|-------------------------------------------------------------|
| Baseline comparison              | Store a JSON file with previous sizes; compare on each run |
| PR comment support               | Use `@actions/github` to post a Markdown table comment     |
| Threshold validation             | Accept `max-size` input; call `core.setFailed` on breach   |
| Artifact uploads                 | Use `actions/upload-artifact` to persist the size report   |
| Multi-framework support          | Auto-detect `vite.config.*`, `webpack.config.*`, etc.      |
| JSON output mode                 | Emit a structured JSON file for downstream consumers       |

---

## License

[MIT](LICENSE)