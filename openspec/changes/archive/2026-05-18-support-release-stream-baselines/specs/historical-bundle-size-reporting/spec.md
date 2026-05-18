## MODIFIED Requirements

### Requirement: Compare Against Historical Releases
The action SHALL compare configured local artifacts against the selected primary npm release baseline and each selected previous npm release baseline.

#### Scenario: Historical releases are selected
- **WHEN** npm release resolution returns a primary release and previous releases
- **THEN** the action computes gzip byte sizes, byte deltas, and percent deltas for each configured file against each release baseline

#### Scenario: No previous releases exist
- **WHEN** npm release resolution returns only the selected primary release
- **THEN** the action still produces a successful primary-release comparison without requiring historical releases

### Requirement: Latest Release Remains Primary Baseline
The action SHALL treat the selected npm release as the primary baseline for top-level report totals and action outputs.

#### Scenario: Latest comparison succeeds
- **WHEN** the action compares local files against the selected primary npm release
- **THEN** existing total size outputs describe the current build compared with the selected primary release baseline

#### Scenario: Latest baseline file is missing
- **WHEN** a configured file cannot be found in the selected primary release tarball
- **THEN** the action fails with an error naming the missing baseline file and release version

### Requirement: Generate Historical Comparison Report
The action SHALL write a JSON comparison report containing the primary release comparison and historical release comparisons.

#### Scenario: Comparison report is written
- **WHEN** release comparisons complete successfully
- **THEN** the JSON report includes package identity, primary baseline metadata, top-level primary comparison results, and a history list for the selected primary release plus selected previous releases

#### Scenario: Historical release is incomplete
- **WHEN** a historical release is missing one or more configured files
- **THEN** the JSON report identifies the release as incomplete and lists missing paths without fabricating gzip totals for missing files

### Requirement: Render Collapsible Historical Comment
The action SHALL render historical release comparisons inside a collapsed details section when pull request commenting is enabled.

#### Scenario: Pull request comment is rendered
- **WHEN** the action renders a bundle-size pull request comment with historical results
- **THEN** the selected primary release comparison is visible by default and the historical release summary appears inside an HTML `<details>` block

#### Scenario: Historical summary includes selected releases
- **WHEN** the historical comment details section is expanded
- **THEN** it shows a release-level summary for the selected primary release and each selected previous release

#### Scenario: Release stream comment is rendered
- **WHEN** the action renders a bundle-size pull request comment for a configured release stream
- **THEN** the comment identifies the configured release stream instead of describing the history as npm latest plus previous releases
