## ADDED Requirements

### Requirement: Configure Tarball Baseline
The action SHALL accept a tarball URI input that identifies the baseline archive used for comparison.

#### Scenario: Valid tarball URI is provided
- **WHEN** the workflow invokes the action with a tarball URI
- **THEN** the action uses that URI as the baseline source for all configured file comparisons

#### Scenario: Tarball URI is missing
- **WHEN** the workflow invokes the action without a tarball URI
- **THEN** the action fails with a configuration error

### Requirement: Configure Compared File Paths
The action SHALL accept one or more file paths that identify artifacts to compare between the local build output and the baseline tarball.

#### Scenario: Multiple files are configured
- **WHEN** the workflow provides multiple file paths
- **THEN** the action compares each configured path independently

#### Scenario: No files are configured
- **WHEN** the workflow invokes the action without any file paths
- **THEN** the action fails with a configuration error

### Requirement: Resolve Local Artifacts
The action SHALL resolve configured file paths relative to the local project root input.

#### Scenario: Local file exists
- **WHEN** a configured file exists under the local project root
- **THEN** the action reads that file as the current artifact for comparison

#### Scenario: Local file is missing
- **WHEN** a configured file does not exist under the local project root
- **THEN** the action fails with an error naming the missing local file

### Requirement: Resolve Tarball Artifacts
The action SHALL resolve configured file paths inside the downloaded tarball baseline.

#### Scenario: Tarball contains package root directory
- **WHEN** the tarball stores files under a single top-level directory
- **THEN** the action resolves configured paths relative to that top-level directory

#### Scenario: Baseline file is missing
- **WHEN** a configured file cannot be found in the tarball baseline
- **THEN** the action fails with an error naming the missing baseline file

### Requirement: Measure Gzip Size
The action SHALL measure gzip-compressed size in bytes for each configured local and baseline file.

#### Scenario: File pair is compared
- **WHEN** a configured file exists locally and in the tarball baseline
- **THEN** the action records gzip byte sizes for both versions of the file

### Requirement: Generate Comparison File
The action SHALL write a comparison file containing gzip-size results for every configured file.

#### Scenario: Comparison succeeds
- **WHEN** all configured files are read and measured successfully
- **THEN** the action writes a comparison file with baseline bytes, current bytes, byte delta, and percent delta for each file

#### Scenario: No target size is configured
- **WHEN** the action generates the comparison file
- **THEN** the action completes without requiring or evaluating any target size
