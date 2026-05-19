<div align="center">
   <a href="https://axios.rest"><img src="https://axios.rest/logo.svg" alt="Axios" /></a><br>
</div>

# Bundle Size Action

A custom GitHub Action that compares gzip bundle sizes for built artifacts against matching files from npm release baselines.

---

## Folder Structure

```
.
├── action.yml                    # GitHub Action metadata
├── package.json                  # Node project manifest (PNPM)
├── pnpm-lock.yaml                # Lockfile (committed)
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite action bundle configuration
├── vitest.config.ts              # Vitest test configuration
├── .gitignore
├── src/
│   ├── index.ts                  # Action entrypoint and testable re-exports
│   └── *.ts                      # Focused action modules
├── tests/
│   └── *.test.ts                 # TypeScript tests run with Vitest
├── dist/
│   └── index.js                  # Vite-bundled action (committed, used at runtime)
└── .github/
    └── workflows/
        └── bundle-size.yml       # Sample workflow that runs this action
```

There is no normal `lib/` workflow. Vite bundles the action directly from TypeScript source into the committed `dist/index.js` artifact.

---

## How It Works

1. **TypeScript** source lives in `src/`.
2. `pnpm run typecheck` (`tsc --noEmit`) performs semantic TypeScript validation without writing build output.
3. `pnpm test` runs TypeScript tests with Vitest against source modules.
4. `pnpm run build` runs Vite, bundling `src/index.ts` and runtime dependencies into `dist/index.js`.
5. `action.yml` points GitHub Actions at `dist/index.js` using the `node24` runner.
6. When the workflow runs, GitHub reads `action.yml`, resolves the inputs, and executes `dist/index.js` — no separate `npm install` step is needed at runtime.

---

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `path` | No | `.` | Path to the local project root containing built artifacts. |
| `package-name` | Yes | | npm package name whose latest and previous releases provide baseline archives. |
| `release-stream` | No | | Optional leading major version number, such as `0` or `1`, used to select npm release baselines from that release stream. |
| `files` | Yes | | Newline-delimited file paths to compare in the local project and npm release baselines. |
| `output-file` | No | `bundle-size-comparison.json` | Path, relative to `path`, where the JSON comparison report will be written. |
| `markdown-output-file` | No | `bundle-size-comparison.md` | Path, relative to `path`, where the Markdown comparison report will be written. |

## Outputs

| Name | Description |
|------|-------------|
| `size` | Total current gzip size in bytes for all compared files. |
| `comparison-file` | Absolute path to the generated JSON comparison file. |
| `markdown-file` | Absolute path to the generated Markdown comparison file. |
| `total-current-gzip-size` | Total current gzip size in bytes for all compared files. |
| `total-baseline-gzip-size` | Total selected primary-release baseline gzip size in bytes for all compared files. |
| `total-delta-gzip-size` | Difference in gzip bytes between current and selected primary-release baseline totals. |

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
      package-name: 'axios'
      files: |
        dist/axios.js
        dist/axios.min.js
        dist/browser/axios.cjs
      output-file: 'bundle-size-comparison.json'
```

To compare against a maintained major-version stream instead of the npm `latest` stream, set `release-stream` to the leading major version. For example, this compares the local build against the newest stable axios `1.x` release and up to 10 previous stable `1.x` releases, even if npm `latest` points to another major version:

```yaml
steps:
  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Build artifacts
    run: pnpm run build

  - name: Compare Bundle Size Against Axios 1.x
    uses: axios/bundle-size@main
    with:
      package-name: 'axios'
      release-stream: '1'
      files: |
        dist/axios.js
        dist/axios.min.js
```

The action does not post pull request comments. It writes both a JSON report and a Markdown report. The only safe way to surface the Markdown report from pull-request-controlled code is to append it to the GitHub Actions job summary:

```yaml
      - name: Add bundle size report to summary
        if: always() && hashFiles('bundle-size-comparison.md') != ''
        run: cat bundle-size-comparison.md >> "$GITHUB_STEP_SUMMARY"
```

Do not use `pull_request_target` to checkout, install, build, or otherwise execute pull-request-controlled code with writable credentials. `pull_request_target` can be appropriate for trusted metadata-only automation, but bundle-size comparison requires building untrusted PR code before the report exists.

The JSON comparison file is machine-readable:

```json
{
  "metric": "gzip",
  "packageName": "axios",
  "baseline": {
    "version": "1.6.8",
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
  },
  "history": [
    {
      "version": "1.6.8",
      "uri": "https://registry.npmjs.org/axios/-/axios-1.6.8.tgz",
      "latest": true,
      "complete": true,
      "missingFiles": [],
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
    },
    {
      "version": "1.6.7",
      "uri": "https://registry.npmjs.org/axios/-/axios-1.6.7.tgz",
      "latest": false,
      "complete": false,
      "missingFiles": ["dist/axios.min.js"],
      "files": [],
      "totals": null
    }
  ]
}
```

The Markdown comparison file is ready to append to `$GITHUB_STEP_SUMMARY` and uses the same bundle-size report structure as the JSON report.

When `release-stream` is omitted, the npm `latest` release is the primary baseline for top-level `baseline`, `files`, `totals`, and action outputs. The `history` array includes the latest release plus up to 10 previous stable releases ordered by npm publish time. When `release-stream` is configured, the newest stable release in that major-version stream is the primary baseline and `history` is limited to that stream; the JSON report includes a top-level `releaseStream` number and the Markdown report describes the configured stream. Previous releases that do not contain every configured file are marked as incomplete instead of failing the action.

Because this repository *is* the action, a workflow inside the same repo can reference it with `./` after preparing local files to compare:

```yaml
- uses: ./
  with:
    path: 'bundle-size-fixture'
    package-name: 'is-number'
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

# Lint with Oxlint
pnpm run lint

# Type-check only (no output)
pnpm run typecheck

# Run tests
pnpm test

# Run tests with CI reporting artifacts and coverage
pnpm run test:ci

# Bundle src/index.ts → dist/index.js with Vite
pnpm run build

# Remove generated Vite output
pnpm run clean
```

> **Important:** always commit the updated `dist/index.js` after a `pnpm run build`. GitHub Actions executes directly from `dist/index.js` with Node 24 — it does *not* re-compile or re-install at runtime. The Vite-built artifact does not require a generated `dist/licenses.txt` file.

The repository pull request workflow runs `pnpm run test:ci` to generate `reports/vitest-junit.xml` for `dorny/test-reporter@v3` and `coverage/coverage-summary.json` for the GitHub Actions job summary. This reporting is only for this repository's CI visibility and is not part of the published bundle-size action API.

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
env \
  'INPUT_PATH=.' \
  'INPUT_PACKAGE-NAME=axios' \
  INPUT_FILES=$'dist/axios.js\ndist/axios.min.js' \
  node dist/index.js
```

---

## Current Behavior

The action fetches npm registry metadata for `package-name`, resolves either the `latest` dist-tag plus up to 10 previous stable releases or the configured `release-stream` plus up to 10 previous stable releases in that major version, downloads each selected release tarball, reads regular file entries, strips a single shared top-level directory such as `package/`, and compares the configured paths against local files under `path`. It measures gzip-compressed bytes for each file and writes JSON and Markdown reports. It does not enforce budgets or target sizes.

Suggested next steps:

| Feature                          | Notes                                                       |
|----------------------------------|-------------------------------------------------------------|
| Threshold validation             | Accept `max-size` input; call `core.setFailed` on breach   |
| Artifact uploads                 | Use `actions/upload-artifact` to persist the size report   |
| Multi-framework support          | Auto-detect `vite.config.*`, `webpack.config.*`, etc.      |
| Private registry auth            | Authenticate npm metadata and tarball requests             |

---

## License

[MIT](LICENSE)
