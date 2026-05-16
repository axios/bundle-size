## ADDED Requirements

### Requirement: Configure PR Commenting
The action SHALL provide an optional input that enables posting the bundle-size comparison report as a pull request comment.

#### Scenario: PR commenting is disabled
- **WHEN** the workflow invokes the action without enabling PR comments
- **THEN** the action completes the comparison using the existing JSON report and outputs behavior
- **AND** the action does not call the GitHub comments API

#### Scenario: PR commenting is enabled without token
- **WHEN** the workflow enables PR comments without providing a GitHub token
- **THEN** the action fails with a configuration error explaining that a token is required for PR comments

### Requirement: Comment Only For Pull Requests
The action SHALL post PR comments only when running in a pull request event context.

#### Scenario: Pull request event is available
- **WHEN** PR commenting is enabled and the GitHub event payload identifies a pull request
- **THEN** the action attempts to post or update a comment on that pull request

#### Scenario: Pull request event is not available
- **WHEN** PR commenting is enabled but the GitHub event payload does not identify a pull request
- **THEN** the action skips comment posting
- **AND** the action still writes the comparison report

### Requirement: Render Bundle Size Markdown Comment
The action SHALL render the comparison report as a Markdown comment containing per-file and total gzip-size differences.

#### Scenario: Comparison contains one or more files
- **WHEN** the action renders the PR comment
- **THEN** the comment includes a Markdown table with file path, baseline gzip size, current gzip size, difference, and status columns
- **AND** the table includes one row for each compared file
- **AND** the table includes a total row

#### Scenario: Comment is rendered
- **WHEN** the action renders the PR comment body
- **THEN** the comment includes a stable hidden marker that identifies it as the bundle-size action comment

### Requirement: Show Status Color For Percent Delta
The action SHALL assign a colored circle status emoji to each file row and total row based on percent delta.

#### Scenario: Percent delta is unavailable
- **WHEN** a comparison result has a null percent delta
- **THEN** the action shows a white circle status emoji

#### Scenario: Percent delta is less than or equal to one percent
- **WHEN** a comparison result has a percent delta less than or equal to `1`
- **THEN** the action shows a green circle status emoji

#### Scenario: Percent delta is greater than one percent and less than or equal to three percent
- **WHEN** a comparison result has a percent delta greater than `1` and less than or equal to `3`
- **THEN** the action shows a blue circle status emoji

#### Scenario: Percent delta is greater than three percent and less than or equal to six percent
- **WHEN** a comparison result has a percent delta greater than `3` and less than or equal to `6`
- **THEN** the action shows a yellow circle status emoji

#### Scenario: Percent delta is greater than six percent and less than or equal to nine percent
- **WHEN** a comparison result has a percent delta greater than `6` and less than or equal to `9`
- **THEN** the action shows an orange circle status emoji

#### Scenario: Percent delta is greater than nine percent
- **WHEN** a comparison result has a percent delta greater than `9`
- **THEN** the action shows a red circle status emoji

### Requirement: Avoid Duplicate PR Comments
The action SHALL update its existing bundle-size PR comment instead of creating duplicate comments for repeated runs.

#### Scenario: Existing bundle-size comment exists
- **WHEN** PR commenting is enabled and the pull request already has a comment containing the bundle-size marker
- **THEN** the action updates that comment with the latest rendered report

#### Scenario: Existing bundle-size comment does not exist
- **WHEN** PR commenting is enabled and the pull request does not have a comment containing the bundle-size marker
- **THEN** the action creates a new comment with the rendered report

### Requirement: Keep Status Informational
The action SHALL NOT fail or pass the comparison based on the PR comment status color.

#### Scenario: Total status is red
- **WHEN** the comparison succeeds and the rendered total row has a red status emoji
- **THEN** the action still completes successfully unless another error occurs
