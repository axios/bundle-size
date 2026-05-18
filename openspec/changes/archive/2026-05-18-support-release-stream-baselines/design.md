## Context

The action currently resolves npm baselines from package metadata by taking the `latest` dist-tag as the primary baseline, then selecting up to 10 previous stable releases ordered by publish time. This works for packages with a single active release line, but it mixes major-version streams for packages that maintain multiple lines, such as axios `0.x` and `1.x`.

Release stream selection needs to happen before tarball download and comparison. The comparison layer already treats the first selected release as the primary baseline and handles later releases as historical context, so the cleanest change is to adjust npm baseline selection while preserving downstream comparison semantics.

## Goals / Non-Goals

**Goals:**

- Add an optional `release-stream` action input for selecting a major-version stream such as `0` or `1`.
- Preserve current default behavior when `release-stream` is omitted.
- When configured, make the newest stable release in the stream the primary baseline, even if npm `latest` points to another major.
- Restrict historical comparisons to stable releases from the configured major-version stream.
- Keep reports and pull request comments clear about whether results represent npm `latest` behavior or a configured stream.

**Non-Goals:**

- Supporting full semver ranges such as `^1.2.0`, `>=1 <2`, `1.2`, or npm dist-tags other than `latest`.
- Changing gzip size semantics, threshold enforcement, target sizes, or failure behavior for missing local/latest baseline files.
- Adding runtime dependencies for semver parsing.
- Building target package artifacts inside the action.

## Decisions

### Use `release-stream` as an optional major-version input

The input will represent the leading semantic version number. Values such as `0` and `1` are valid. Empty input means no stream filter and preserves the existing npm `latest` behavior.

Alternative considered: name the input `major-version` or `baseline-major`. `release-stream` better matches the user-facing concept of parallel maintained release lines and leaves room for documentation that says `release-stream: '1'` means the `1.x` stream.

### Select the primary baseline from the stream when configured

When `release-stream` is set, npm `latest` no longer determines the primary baseline. The resolver should select the newest stable published version whose parsed major equals the configured stream, then select up to 10 earlier stable versions in that same stream.

Alternative considered: keep npm `latest` as the primary baseline and filter only historical rows. That would produce split reports such as a `1.x` primary baseline with `0.x` history when running maintenance-branch checks, which is misleading for multi-stream packages.

### Keep semver parsing intentionally narrow

The resolver only needs enough parsing to identify stable versions and compare the leading numeric major. Existing stable filtering already excludes versions containing `-`. The implementation can parse the major with a small regular expression for `^(\d+)\.` and avoid adding a semver dependency.

Alternative considered: add a semver package. That would be more general, but the proposed capability is intentionally limited to leading major-version streams and the action keeps runtime dependencies small.

### Preserve report structure and add minimal stream metadata if needed

The existing JSON report already includes package identity, primary baseline metadata, and a `history` array. The baseline version itself communicates the selected primary release. If comment/report wording needs to distinguish stream mode, the action config or report can include optional release-stream metadata without changing gzip comparison fields.

Alternative considered: restructure `history` around stream objects. That would be heavier than needed because the action still compares one selected primary release plus historical release rows.

## Risks / Trade-offs

- Ambiguous version strings in npm metadata → Ignore prereleases as today and match only versions with a numeric major segment; add tests for malformed/non-matching versions if supported by metadata fixtures.
- Users may expect semver ranges from `release-stream` → Document that only a leading major number is accepted and fail validation for anything else.
- Comment wording may become inaccurate if left hardcoded → Update the collapsed history summary and tests alongside resolver behavior.
- Stream with no matching stable releases → Fail during npm baseline resolution with an error naming the package and requested release stream.
