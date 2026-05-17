## MODIFIED Requirements

### Requirement: Configure Compared File Paths
The action SHALL accept one or more file paths that identify artifacts to compare between the local build output and npm release baseline tarballs.

#### Scenario: Multiple files are configured
- **WHEN** the workflow provides multiple file paths
- **THEN** the action compares each configured path independently

#### Scenario: No files are configured
- **WHEN** the workflow invokes the action without any file paths
- **THEN** the action fails with a configuration error

### Requirement: Resolve Tarball Artifacts
The action SHALL resolve configured file paths inside downloaded npm release tarball baselines.

#### Scenario: Tarball contains package root directory
- **WHEN** a release tarball stores files under a single top-level directory
- **THEN** the action resolves configured paths relative to that top-level directory

#### Scenario: Latest baseline file is missing
- **WHEN** a configured file cannot be found in the latest release tarball baseline
- **THEN** the action fails with an error naming the missing baseline file and release version

### Requirement: Generate Comparison File
The action SHALL write a comparison file containing gzip-size results for every configured file against the latest release and historical release baselines.

#### Scenario: Comparison succeeds
- **WHEN** all configured local files and latest baseline files are read and measured successfully
- **THEN** the action writes a comparison file with latest baseline bytes, current bytes, byte delta, and percent delta for each file

#### Scenario: Historical comparisons exist
- **WHEN** previous release baselines are selected
- **THEN** the action includes historical comparison results in the comparison file

#### Scenario: No target size is configured
- **WHEN** the action generates the comparison file
- **THEN** the action completes without requiring or evaluating any target size

## REMOVED Requirements

### Requirement: Configure Tarball Baseline
**Reason**: The action now supports only npm registry release baselines so it can automatically compare against the latest release and 10 previous releases.
**Migration**: Replace the `tarball-uri` input with the npm package name input for the package being compared.
