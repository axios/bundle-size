## MODIFIED Requirements

### Requirement: Select Latest And Previous Releases
The action SHALL select npm release baselines from either the package `latest` dist-tag or a configured major-version release stream.

#### Scenario: More than 10 previous releases exist
- **WHEN** the package has a latest release and more than 10 earlier stable releases
- **THEN** the action selects the latest release plus the 10 most recently published previous stable releases

#### Scenario: Fewer than 10 previous releases exist
- **WHEN** the package has a latest release and fewer than 10 earlier stable releases
- **THEN** the action selects the latest release plus all available previous stable releases

#### Scenario: Latest dist-tag is missing
- **WHEN** the package metadata does not define a `latest` dist-tag that points to a version record and no release stream is configured
- **THEN** the action fails with an error naming the missing latest release metadata

#### Scenario: Release stream is configured
- **WHEN** the workflow configures `release-stream` with a major version number
- **THEN** the action selects the newest stable release in that major-version stream as the primary baseline plus up to 10 earlier stable releases from the same stream

#### Scenario: Release stream excludes npm latest
- **WHEN** the npm `latest` dist-tag points to a different major version than the configured `release-stream`
- **THEN** the action selects the newest stable release from the configured stream instead of the npm latest release

#### Scenario: Release stream has no stable releases
- **WHEN** the workflow configures `release-stream` and package metadata contains no stable versions in that major-version stream
- **THEN** the action fails with an error naming the package and requested release stream

## ADDED Requirements

### Requirement: Configure Release Stream Baseline
The action SHALL accept an optional release-stream input that identifies the npm major-version stream used for release baseline selection.

#### Scenario: Release stream is omitted
- **WHEN** the workflow invokes the action without a release-stream input
- **THEN** the action preserves default npm latest baseline selection behavior

#### Scenario: Release stream is provided
- **WHEN** the workflow invokes the action with a release-stream input such as `1`
- **THEN** the action uses that leading major version number to resolve npm release baselines from the matching release stream

#### Scenario: Release stream is invalid
- **WHEN** the workflow invokes the action with a release-stream input that is not a non-negative integer major version
- **THEN** the action fails with a configuration error naming the invalid release-stream input
