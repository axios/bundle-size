## Context

The action currently compares built local artifacts against one explicit `.tar.gz` archive supplied through `tarball-uri`. That keeps the implementation simple, but it pushes npm release discovery into each workflow and only gives reviewers a single point comparison.

The new behavior makes the npm registry the only baseline source. A workflow identifies an npm package, the action resolves the `latest` dist-tag and up to 10 previous releases, downloads each release tarball from registry metadata, and compares the current local artifacts against those baselines using gzip size.

The existing module boundaries should remain intact. `src/index.ts` stays thin; config parsing, npm metadata resolution, tarball extraction, comparison, reporting, and comment rendering should remain in focused modules.

## Goals / Non-Goals

**Goals:**

- Replace arbitrary tarball URI configuration with npm package baseline configuration.
- Resolve latest plus 10 previous npm releases when they exist.
- Preserve current latest-release outputs and JSON fields where practical so existing output consumers still get a primary comparison.
- Add historical comparison data to the JSON report.
- Render historical release comparisons inside a collapsed `<details>` block in PR comments.
- Keep gzip bytes as the canonical metric.
- Preserve configured file path safety and npm package-root stripping behavior.
- Test npm metadata resolution, comparison behavior, report shape, and comment rendering without live network access.

**Non-Goals:**

- No bundle-size budgets, thresholds, or failing on size increase.
- No GitHub Releases support.
- No package-manager shorthand such as `npm:axios@latest`.
- No target project build step inside the action.
- No artifact upload or separate check-run publishing.
- No private registry authentication unless a later change explicitly adds it.

## Decisions

### Npm Package Input Replaces `tarball-uri`

The action will accept an npm package name input, such as `package-name`, and no longer require or support arbitrary `tarball-uri` configuration.

Rationale: the desired behavior is npm-release history, not generic archive comparison. Inferring npm package identity from a tarball URL would preserve old shape but create fragile parsing rules and unclear behavior for non-npm URLs.

Alternative considered: keep `tarball-uri` and add optional historical tarball URIs. That would be simpler internally but would not solve the workflow burden of discovering latest and previous releases.

### Resolve Releases From Npm Metadata

Add a focused npm registry resolver module that fetches package metadata from `https://registry.npmjs.org/<encoded-package-name>`, reads `dist-tags.latest`, and selects previous versions using the metadata `time` map. Use each selected version's `dist.tarball` URL as the archive source.

Rationale: npm metadata is the source of truth for published package tarballs and publish order. Publish time better represents release history than semver sorting.

Alternative considered: semver-sort all versions. That can produce surprising order for backports or out-of-order publishes.

### Latest Is Primary, Previous Releases Are Context

The latest release comparison remains the primary baseline. Existing action outputs such as `total-baseline-gzip-size` and `total-delta-gzip-size` continue to describe current versus latest. Previous releases are added to report history and comment details.

Rationale: PR reviewers need a clear default signal. Historical context is useful but should not obscure the primary latest-release comparison.

Alternative considered: make all releases peers and remove the current top-level baseline/files/totals shape. That is cleaner conceptually but more disruptive for JSON consumers and action outputs.

### Historical Missing Files Are Reported, Not Fatal

Configured local files and latest-release baseline files remain strict: missing files fail the action. Previous-release tarballs may be missing files because package layouts evolve; those missing historical file results should be represented in history and summarized as incomplete rather than failing the action.

Rationale: old releases should not make the action unusable when they predate a new artifact, but the report must remain honest about incomplete comparisons.

Alternative considered: fail on any missing historical file. That maximizes strictness but makes the 10-release feature brittle.

### Collapsible Historical Comment

The PR comment renders the latest comparison table as it does today, then appends a `<details>` block with a release-level historical summary table for latest plus previous releases.

Rationale: this keeps the common review view compact while making trend context available on demand. Full per-file historical details remain in JSON.

Alternative considered: render every file for every release in the comment. That grows quickly and makes PR comments noisy.

### No New Runtime Dependency By Default

Use Node 24 built-ins for HTTP requests and URL handling. If semver filtering becomes necessary, prefer a small local prerelease check over adding a runtime dependency unless correctness requires a package.

Rationale: runtime dependencies should stay small and Vite bundles runtime dependencies into the committed action artifact.

Alternative considered: add `semver` for version classification. That is robust but increases runtime dependency surface for a small initial need.

## Risks / Trade-offs

- **Breaking input contract** → Update `action.yml`, README, tests, and examples together; clearly document that npm package resolution replaces `tarball-uri`.
- **Npm metadata shape or network failures** → Fail with errors that name the package and failing registry operation.
- **Scoped package URL encoding mistakes** → Cover scoped names such as `@scope/pkg` in resolver tests.
- **Prerelease ambiguity** → Default to stable previous releases and use `latest` as the primary release even if a package owner points it at a prerelease; document this behavior.
- **Historical reports can grow large** → Limit previous releases to 10 and keep PR comments to release-level summaries inside `<details>`.
- **Partial historical comparisons can be misunderstood** → Mark incomplete historical releases explicitly with missing file counts or paths.
- **Existing report consumers may rely on old baseline URI semantics** → Preserve primary latest comparison fields where practical, but document the new `baseline.version` and npm package metadata.

## Migration Plan

1. Add npm package input metadata and remove `tarball-uri` from documented usage.
2. Implement npm metadata resolution behind a focused module with mocked tests.
3. Extend comparison/report/comment types to represent primary latest comparison plus history.
4. Update README examples and workflow fixtures to use npm package input.
5. Build and commit updated `dist/index.js`.

Rollback would restore the previous `tarball-uri` input and single-baseline report model from the prior release, but this change is intentionally breaking and should be reviewed as a contract replacement.

## Open Questions

- Should the input be named `package-name`, `npm-package`, or simply `package`?
- Should the previous-release count be configurable later, or fixed at 10 for this change?
- Should previous releases exclude deprecated versions, or only exclude prereleases by default?
