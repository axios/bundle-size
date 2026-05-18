## Why

Packages such as axios maintain multiple release streams, where the npm `latest` dist-tag may point at `1.x` while `0.x` still receives maintenance releases. The action currently selects historical baselines across all stable versions before `latest`, which can mix unrelated major-version streams and make maintenance-branch bundle-size comparisons noisy or misleading.

## What Changes

- Add an optional `release-stream` input that accepts a leading major version number such as `0` or `1`.
- When `release-stream` is omitted, preserve the current behavior: use the npm `latest` dist-tag as the primary baseline and select up to 10 previous stable releases by publish time.
- When `release-stream` is provided, select the newest stable release in that major-version stream as the primary baseline, then select up to 10 previous stable releases from the same stream.
- Fail with a clear error when the configured release stream has no matching stable releases.
- Reflect release-stream selection in reports, pull request comments, README examples, and action metadata.
- Non-goals: no threshold enforcement, no target-size behavior, no package build orchestration, and no semver range expression support beyond a leading major version stream.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `npm-release-baselines`: Add optional release-stream selection and define how npm release baselines are selected when a major-version stream is configured.
- `historical-bundle-size-reporting`: Clarify that the primary baseline and history may represent either the npm latest baseline or a configured release stream.

## Impact

- `action.yml`: add and document the optional `release-stream` input.
- `src/config.ts` and `src/types.ts`: read, validate, and pass through the optional release stream.
- `src/npm.ts`: filter/select release baselines by configured major-version stream while preserving default behavior.
- `src/action.ts`: pass the configured release stream into npm release baseline resolution.
- `src/comment.ts` and report-related types/tests: describe release-stream history accurately instead of always saying latest plus 10 previous npm releases.
- `README.md`: document input behavior, examples, and report/comment semantics.
- `tests/`: add module-aligned coverage for configuration validation, npm baseline selection, action orchestration, and comment/report wording.
- `dist/index.js`: rebuild so the committed GitHub Action runtime matches the TypeScript source.
