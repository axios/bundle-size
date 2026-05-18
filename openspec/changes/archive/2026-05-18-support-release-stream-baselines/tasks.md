## 1. Inputs And Configuration

- [x] 1.1 Add the optional `release-stream` input to `action.yml` with documentation that it accepts a leading major version number.
- [x] 1.2 Extend shared config types to carry an optional release stream value.
- [x] 1.3 Update `src/config.ts` to read and validate `release-stream`, preserving current behavior when omitted.
- [x] 1.4 Add configuration tests for omitted release stream, valid `0` and `1` streams, and invalid non-integer or negative values.

## 2. Npm Release Selection

- [x] 2.1 Update npm release baseline selection to accept an optional release stream parameter.
- [x] 2.2 Preserve existing latest-dist-tag selection when no release stream is configured.
- [x] 2.3 When a release stream is configured, select the newest stable release in that major version as the primary baseline and up to 10 previous stable releases from the same stream.
- [x] 2.4 Add npm resolver tests for stream filtering, stream latest overriding npm `latest`, stream limiting to 10 previous releases, missing stream matches, and default behavior compatibility.

## 3. Action Orchestration And Reporting

- [x] 3.1 Pass the configured release stream from action configuration into npm release baseline resolution.
- [x] 3.2 Update report types or metadata only as needed to describe configured release-stream selection without changing gzip comparison fields.
- [x] 3.3 Update pull request comment rendering so stream-filtered history does not say `latest + 10 previous npm releases`.
- [x] 3.4 Add or update action, report, and comment tests covering configured release streams and default wording.

## 4. Documentation And Examples

- [x] 4.1 Update README input documentation for `release-stream`.
- [x] 4.2 Add a workflow example for comparing against a specific release stream such as axios `1.x`.
- [x] 4.3 Update report/comment documentation to explain primary baseline behavior with and without `release-stream`.

## 5. Verification And Build Artifacts

- [x] 5.1 Run `pnpm run lint` and fix reported lint issues.
- [x] 5.2 Run `pnpm run typecheck` and fix TypeScript errors.
- [x] 5.3 Run `pnpm test` and confirm the test suite passes.
- [x] 5.4 Run `pnpm run build` and include the updated `dist/index.js` output.
- [x] 5.5 Inspect `dist/index.js`, `action.yml`, README, and tests to confirm the committed action matches the release-stream baseline contract.
