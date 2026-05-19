## ADDED Requirements

### Requirement: Document External PR Commenting
The documentation SHALL explain that pull request comments are published outside the action from the generated Markdown comparison report.

#### Scenario: User reads PR comment documentation
- **WHEN** a user needs a pull request comment
- **THEN** the documentation explains that the action writes JSON and Markdown reports
- **AND** the documentation explains that workflow steps outside the action are responsible for publishing pull request comments from the Markdown report

#### Scenario: User migrates from built-in commenting
- **WHEN** a user has an existing workflow that used built-in PR commenting inputs
- **THEN** the documentation shows how to replace those inputs with an external comment publishing step that reads the generated Markdown report

### Requirement: Generate Markdown Comment Report
The action SHALL write a Markdown comparison report containing the same body used for pull request comments.

#### Scenario: Markdown report path uses default
- **WHEN** the workflow invokes the action without configuring the Markdown report path
- **THEN** the action writes the Markdown report under the local project root at `bundle-size-comparison.md`
- **AND** the action exposes the absolute Markdown report path as an output

#### Scenario: Markdown report path is configured
- **WHEN** the workflow configures the Markdown report path
- **THEN** the action writes the Markdown report under the local project root at the configured relative path
- **AND** the action exposes the absolute Markdown report path as an output

#### Scenario: Markdown report path is unsafe
- **WHEN** the workflow configures a Markdown report path that is absolute or escapes the local project root
- **THEN** the action fails with a path safety error

### Requirement: Document Same-Repository Comment Workflow
The documentation SHALL provide a same-repository pull request workflow recipe that upserts a bundle-size comment from the Markdown report.

#### Scenario: Same-repository pull request comment recipe
- **WHEN** a pull request workflow has permission to write pull request or issue comments
- **THEN** the documentation shows a recipe that reads the Markdown report after the comparison step
- **AND** the recipe creates or updates the pull request comment identified by the bundle-size marker

#### Scenario: Same-repository recipe limitations
- **WHEN** the documentation presents the same-workflow comment recipe
- **THEN** it states that the recipe does not bypass GitHub's read-only token restrictions for public fork pull requests

### Requirement: Document Fork-Safe Comment Workflow
The documentation SHALL provide a public fork-safe workflow pattern that separates untrusted comparison execution from trusted comment publishing.

#### Scenario: Fork-safe comparison workflow
- **WHEN** a public repository accepts pull requests from forks
- **THEN** the documentation shows that the `pull_request` workflow runs the bundle-size comparison without write credentials
- **AND** the documentation shows that the workflow uploads the Markdown comparison report as an artifact

#### Scenario: Fork-safe comment workflow
- **WHEN** the Markdown comparison artifact is available from a completed pull request workflow run
- **THEN** the documentation shows a trusted `workflow_run` workflow that downloads the Markdown report artifact
- **AND** the workflow posts or updates the pull request comment with the Markdown report and a token that has comment write permission

#### Scenario: Fork-safe workflow avoids unsafe target event usage
- **WHEN** the documentation explains public fork support
- **THEN** it warns users not to use `pull_request_target` to checkout, install, build, or otherwise execute pull-request-controlled code with writable credentials

### Requirement: Generate Current Bundle Size Comment Shape
The generated Markdown report SHALL use the same Markdown structure as the previous built-in PR comment.

#### Scenario: Comment marker is rendered
- **WHEN** the action writes the Markdown report
- **THEN** the comment begins with the stable hidden bundle-size marker

#### Scenario: Primary comparison table is rendered
- **WHEN** the action writes the Markdown report from a complete comparison report
- **THEN** the comment includes the `Bundle Size Report` heading
- **AND** the comment includes a baseline description with the package name and selected baseline version
- **AND** the comment includes a Markdown table with file path, baseline gzip size, current gzip size, difference, and status columns
- **AND** the table includes one row for each compared file
- **AND** the table includes a total row

#### Scenario: Historical comparison section is rendered
- **WHEN** the action writes the Markdown report from a report with history
- **THEN** the comment includes a collapsed details section for historical release comparisons
- **AND** the section includes one row for each historical release
- **AND** incomplete historical releases identify the missing files

#### Scenario: Release stream wording is rendered
- **WHEN** the comparison report includes a release stream
- **THEN** the generated Markdown identifies the configured release stream in the baseline description and history summary

### Requirement: Document Current Status Color Semantics
The generated Markdown report SHALL assign a colored circle status emoji to each file row, release row, and total row based on percent delta.

#### Scenario: Percent delta is unavailable
- **WHEN** a comparison result has a null percent delta
- **THEN** the generated Markdown shows a white circle status emoji

#### Scenario: Percent delta is less than or equal to one percent
- **WHEN** a comparison result has a percent delta less than or equal to `1`
- **THEN** the generated Markdown shows a green circle status emoji

#### Scenario: Percent delta is greater than one percent and less than or equal to three percent
- **WHEN** a comparison result has a percent delta greater than `1` and less than or equal to `3`
- **THEN** the generated Markdown shows a blue circle status emoji

#### Scenario: Percent delta is greater than three percent and less than or equal to six percent
- **WHEN** a comparison result has a percent delta greater than `3` and less than or equal to `6`
- **THEN** the generated Markdown shows a yellow circle status emoji

#### Scenario: Percent delta is greater than six percent and less than or equal to nine percent
- **WHEN** a comparison result has a percent delta greater than `6` and less than or equal to `9`
- **THEN** the generated Markdown shows an orange circle status emoji

#### Scenario: Percent delta is greater than nine percent
- **WHEN** a comparison result has a percent delta greater than `9`
- **THEN** the generated Markdown shows a red circle status emoji

### Requirement: Keep External Comment Status Informational
The documented comment workflow SHALL NOT treat status colors as bundle-size budget or threshold enforcement.

#### Scenario: Total status is red
- **WHEN** the comparison succeeds and the rendered total row has a red status emoji
- **THEN** the documented comment workflow still treats the comparison report as informational unless the user adds separate enforcement logic

## REMOVED Requirements

### Requirement: Configure PR Commenting
**Reason**: Built-in comment posting requires a writable GitHub token and cannot reliably support public fork pull requests from the same `pull_request` workflow context.
**Migration**: Run the action to produce the Markdown comparison report, then use a separate workflow step or trusted `workflow_run` workflow to post that report as the pull request comment.

### Requirement: Comment Only For Pull Requests
**Reason**: Pull request detection and comment publishing move out of the action runtime and into user-owned workflow code.
**Migration**: Use the documented external comment recipe to detect the pull request number from the workflow event or associated workflow run.

### Requirement: Render Bundle Size Markdown Comment
**Reason**: The action no longer renders a runtime pull request comment body as part of comparison execution.
**Migration**: Use the generated Markdown report as the pull request comment body.

### Requirement: Show Status Color For Percent Delta
**Reason**: Runtime comment rendering is removed from the action.
**Migration**: Use the generated Markdown report, which preserves the same status color thresholds.

### Requirement: Avoid Duplicate PR Comments
**Reason**: Comment upsert behavior moves out of the action runtime and into user-owned workflow code.
**Migration**: Use the documented external comment recipe to find an existing comment containing the bundle-size marker and update it instead of creating duplicates.

### Requirement: Keep Status Informational
**Reason**: Runtime comment rendering is removed from the action.
**Migration**: Treat the documented comment workflow as informational unless the workflow adds separate budget or threshold enforcement.
