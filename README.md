# Bundle Size Action

A custom GitHub Action that compares gzip bundle sizes for built artifacts against matching files from a tarball baseline.

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
│   └── index.ts                  # Action entrypoint and comparison logic
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
4. `action.yml` points GitHub Actions at `dist/index.js` using the `node24` runner.
5. When the workflow runs, GitHub reads `action.yml`, resolves the inputs, and executes `dist/index.js` — no separate `npm install` step is needed at runtime.

---

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `path` | No | `.` | Path to the local project root containing built artifacts. |
| `tarball-uri` | Yes | | HTTP(S) URI of the `.tar.gz` baseline archive to compare against. |
| `files` | Yes | | Newline-delimited file paths to compare in the local project and tarball baseline. |
| `output-file` | No | `bundle-size-comparison.json` | Path, relative to `path`, where the JSON comparison report will be written. |
| `comment-pr` | No | `false` | Post or update a bundle size summary comment on pull requests. |
| `github-token` | No | | GitHub token used to post pull request comments when `comment-pr` is enabled. |

## Outputs

| Name | Description |
|------|-------------|
| `size` | Total current gzip size in bytes for all compared files. |
| `comparison-file` | Absolute path to the generated JSON comparison file. |
| `total-current-gzip-size` | Total current gzip size in bytes for all compared files. |
| `total-baseline-gzip-size` | Total baseline gzip size in bytes for all compared files. |
| `total-delta-gzip-size` | Difference in gzip bytes between current and baseline totals. |

---

## Usage in a Workflow

Build your project first, then run the action against the generated files. In pull request workflows, `actions/checkout` checks out the PR merge ref by default, so the local build represents the artifact sizes that would result after merge.

```yaml
permissions:
  contents: read

steps:
  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Build artifacts
    run: pnpm run build

  - name: Compare Bundle Size
    uses: axios/bundle-size@main
    with:
      path: '.'
      tarball-uri: 'https://registry.npmjs.org/axios/-/axios-1.6.8.tgz'
      files: |
        dist/axios.js
        dist/axios.min.js
        dist/browser/axios.cjs
      output-file: 'bundle-size-comparison.json'
```

To post the comparison directly on pull requests, enable `comment-pr` and provide a token with comment write permission:

```yaml
permissions:
  contents: read
  pull-requests: write

steps:
  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Build artifacts
    run: pnpm run build

  - name: Compare Bundle Size
    uses: axios/bundle-size@main
    with:
      tarball-uri: 'https://registry.npmjs.org/axios/-/axios-1.6.8.tgz'
      files: |
        dist/axios.js
        dist/axios.min.js
      comment-pr: true
      github-token: ${{ github.token }}
```

When `comment-pr` is enabled outside a pull request event, the action writes the JSON report and skips commenting. Fork pull requests can receive read-only tokens depending on repository settings; in that case GitHub may reject comment creation with a permissions error.

The comparison file is JSON:

```json
{
  "metric": "gzip",
  "baseline": {
    "uri": "https://registry.npmjs.org/axios/-/axios-1.6.8.tgz"
  },
  "localRoot": "/home/runner/work/project/project",
  "files": [
    {
      "path": "dist/axios.min.js",
      "baselineBytes": 14233,
      "currentBytes": 14512,
      "deltaBytes": 279,
      "deltaPercent": 1.96
    }
  ],
  "totals": {
    "baselineBytes": 14233,
    "currentBytes": 14512,
    "deltaBytes": 279,
    "deltaPercent": 1.96
  }
}
```

Because this repository *is* the action, a workflow inside the same repo can reference it with `./` after preparing local files to compare:

```yaml
- uses: ./
  with:
    path: 'bundle-size-fixture'
    tarball-uri: 'https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz'
    files: |
      index.js
```

See [`.github/workflows/bundle-size.yml`](.github/workflows/bundle-size.yml) for a complete example.

---

## Build Instructions

### Prerequisites

- Node.js ≥ 24
- PNPM ≥ 11 — install with Corepack or `npm install -g pnpm` if not already available

### Commands

```bash
# Install dependencies
pnpm install

# Type-check only (no output)
pnpm run lint

# Run tests
pnpm test

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
INPUT_PATH="." \
INPUT_TARBALL_URI="https://registry.npmjs.org/axios/-/axios-1.6.8.tgz" \
INPUT_FILES=$'dist/axios.js\ndist/axios.min.js' \
node dist/index.js
```

---

## Current Behavior

The action downloads the configured tarball, reads regular file entries, strips a single shared top-level directory such as `package/`, and compares the configured paths against local files under `path`. It measures gzip-compressed bytes for each file and writes a JSON report. It does not enforce budgets or target sizes.

Suggested next steps:

| Feature                          | Notes                                                       |
|----------------------------------|-------------------------------------------------------------|
| Threshold validation             | Accept `max-size` input; call `core.setFailed` on breach   |
| Artifact uploads                 | Use `actions/upload-artifact` to persist the size report   |
| Multi-framework support          | Auto-detect `vite.config.*`, `webpack.config.*`, etc.      |
| Package URI resolution           | Resolve package manager aliases such as `npm:axios@latest` |

---

## License

[MIT](LICENSE)
