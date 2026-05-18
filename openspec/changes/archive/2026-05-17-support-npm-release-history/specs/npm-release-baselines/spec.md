## ADDED Requirements

### Requirement: Configure Npm Package Baseline
The action SHALL accept an npm package name input that identifies the package used for release baseline comparisons.

#### Scenario: Package name is provided
- **WHEN** the workflow invokes the action with a valid npm package name
- **THEN** the action uses that package's npm registry metadata to resolve release baselines

#### Scenario: Package name is missing
- **WHEN** the workflow invokes the action without an npm package name
- **THEN** the action fails with a configuration error naming the missing package input

#### Scenario: Scoped package name is provided
- **WHEN** the workflow invokes the action with a scoped package name such as `@scope/name`
- **THEN** the action requests the correctly encoded npm registry metadata URL for that package

### Requirement: Fetch Npm Registry Metadata
The action SHALL fetch package metadata from the public npm registry to discover available package releases.

#### Scenario: Registry metadata is available
- **WHEN** the npm registry returns metadata for the configured package
- **THEN** the action reads dist-tags, version records, publish times, and tarball URLs from the metadata

#### Scenario: Registry metadata request fails
- **WHEN** the npm registry metadata request fails or returns a non-successful response
- **THEN** the action fails with an error naming the package and registry request failure

### Requirement: Select Latest And Previous Releases
The action SHALL select the package version referenced by the npm `latest` dist-tag and up to 10 previous stable releases ordered by publish time.

#### Scenario: More than 10 previous releases exist
- **WHEN** the package has a latest release and more than 10 earlier stable releases
- **THEN** the action selects the latest release plus the 10 most recently published previous stable releases

#### Scenario: Fewer than 10 previous releases exist
- **WHEN** the package has a latest release and fewer than 10 earlier stable releases
- **THEN** the action selects the latest release plus all available previous stable releases

#### Scenario: Latest dist-tag is missing
- **WHEN** the package metadata does not define a `latest` dist-tag that points to a version record
- **THEN** the action fails with an error naming the missing latest release metadata

### Requirement: Resolve Release Tarball URIs
The action SHALL use each selected npm version's `dist.tarball` URL as the archive source for that release baseline.

#### Scenario: Selected version has tarball URL
- **WHEN** a selected version record contains a tarball URL
- **THEN** the action downloads that tarball and uses it for baseline file resolution

#### Scenario: Selected version lacks tarball URL
- **WHEN** a selected version record does not contain a usable tarball URL
- **THEN** the action fails with an error naming the affected package version
