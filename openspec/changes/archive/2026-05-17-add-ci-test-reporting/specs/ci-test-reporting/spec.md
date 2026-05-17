## ADDED Requirements

### Requirement: Publish CI Test Report
The repository CI workflow SHALL publish Vitest test results through GitHub's native reporting surface using `dorny/test-reporter@v3`.

#### Scenario: Test results are generated
- **WHEN** the pull request workflow runs the Vitest suite
- **THEN** the workflow writes a machine-readable test result file for the reporter to consume

#### Scenario: Test report is published
- **WHEN** a machine-readable test result file is available and the workflow has permission to create checks
- **THEN** `dorny/test-reporter@v3` publishes the test results as a GitHub test report

#### Scenario: Tests fail
- **WHEN** Vitest produces failing test results
- **THEN** the test reporter still runs unless the workflow is cancelled
- **AND** the final CI status still reflects the failed tests

### Requirement: Expose CI Coverage Summary
The repository CI workflow SHALL generate Vitest coverage information and expose a concise coverage summary in CI output.

#### Scenario: Coverage is generated
- **WHEN** the pull request workflow runs the CI test command
- **THEN** Vitest produces coverage summary data for the repository test suite

#### Scenario: Coverage is visible to reviewers
- **WHEN** coverage summary data is available
- **THEN** the workflow exposes the coverage summary in a reviewer-visible CI surface

### Requirement: Keep Reporting Repository-Scoped
The CI test reporting behavior SHALL remain scoped to this repository's workflows and SHALL NOT change the published bundle-size action behavior.

#### Scenario: Bundle-size action metadata is unchanged
- **WHEN** CI test reporting is added
- **THEN** the bundle-size action does not gain new test-reporting or coverage-related inputs or outputs

#### Scenario: Runtime bundle is unaffected
- **WHEN** CI test reporting is added only through workflow and test tooling changes
- **THEN** the action runtime bundle does not require a rebuild for reporting behavior
