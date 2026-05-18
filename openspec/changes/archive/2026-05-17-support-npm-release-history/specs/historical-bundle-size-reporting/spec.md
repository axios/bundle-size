## ADDED Requirements

### Requirement: Compare Against Historical Releases
The action SHALL compare configured local artifacts against the latest npm release and each selected previous npm release.

#### Scenario: Historical releases are selected
- **WHEN** npm release resolution returns the latest release and previous releases
- **THEN** the action computes gzip byte sizes, byte deltas, and percent deltas for each configured file against each release baseline

#### Scenario: No previous releases exist
- **WHEN** npm release resolution returns only the latest release
- **THEN** the action still produces a successful latest-release comparison without requiring historical releases

### Requirement: Latest Release Remains Primary Baseline
The action SHALL treat the npm latest release as the primary baseline for top-level report totals and action outputs.

#### Scenario: Latest comparison succeeds
- **WHEN** the action compares local files against the latest npm release
- **THEN** existing total size outputs describe the current build compared with the latest release baseline

#### Scenario: Latest baseline file is missing
- **WHEN** a configured file cannot be found in the latest release tarball
- **THEN** the action fails with an error naming the missing baseline file and release version

### Requirement: Historical Missing Files Are Reported
The action SHALL report missing configured files in previous-release baselines without failing the entire action.

#### Scenario: Previous release is missing a configured file
- **WHEN** a configured file cannot be found in a previous release tarball
- **THEN** the historical comparison marks that release or file as incomplete and includes the missing file path in the report

#### Scenario: Previous release has all configured files
- **WHEN** a previous release tarball contains all configured files
- **THEN** the historical comparison records complete per-file and total gzip comparison results for that release

### Requirement: Generate Historical Comparison Report
The action SHALL write a JSON comparison report containing the primary latest-release comparison and historical release comparisons.

#### Scenario: Comparison report is written
- **WHEN** release comparisons complete successfully
- **THEN** the JSON report includes package identity, latest baseline metadata, top-level latest comparison results, and a history list for latest plus previous releases

#### Scenario: Historical release is incomplete
- **WHEN** a historical release is missing one or more configured files
- **THEN** the JSON report identifies the release as incomplete and lists missing paths without fabricating gzip totals for missing files

### Requirement: Render Collapsible Historical Comment
The action SHALL render historical release comparisons inside a collapsed details section when pull request commenting is enabled.

#### Scenario: Pull request comment is rendered
- **WHEN** the action renders a bundle-size pull request comment with historical results
- **THEN** the latest-release comparison is visible by default and the historical release summary appears inside an HTML `<details>` block

#### Scenario: Historical summary includes selected releases
- **WHEN** the historical comment details section is expanded
- **THEN** it shows a release-level summary for the latest release and each selected previous release
