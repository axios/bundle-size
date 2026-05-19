# Security Policy

## Supported Code

Security fixes are handled for the current default branch of this repository and the committed GitHub Action bundle in `dist/`.

GitHub Actions executes `dist/index.js` directly. Security fixes that affect runtime behavior must update both the TypeScript source and the bundled `dist/` output.

## Reporting A Vulnerability

Please do not report suspected vulnerabilities in public issues, pull requests, discussions, or comments.

Use GitHub's private vulnerability reporting or security advisory flow when available:

https://github.com/axios/bundle-size/security/advisories/new

If private reporting is unavailable, contact the maintainers through the repository and ask for a private disclosure channel before sharing exploit details.

Include as much of the following as possible:

- Affected version, commit, or action reference.
- A clear description of the vulnerability and impact.
- Steps to reproduce or a minimal proof of concept.
- Relevant workflow configuration.
- Whether secrets, tokens, workspace files, reports, or pull request comments are affected.
- Any suggested mitigation or patch, if available.

## Response Expectations

Maintainers will make a best-effort attempt to:

- Acknowledge the report within a reasonable timeframe.
- Confirm whether the issue is in scope.
- Coordinate a fix privately when the issue has security impact.
- Credit the reporter if requested and appropriate.
- Publish advisory details after a fix or mitigation is available.

Please allow maintainers time to investigate before public disclosure.

## Security Scope

In scope examples:

- Path traversal that reads or writes outside the configured `path` root.
- Tarball parsing flaws that allow workspace overwrite, unexpected file selection, or denial of service.
- Leaks of `GITHUB_TOKEN` or other secrets through logs, reports, outputs, or comments.
- Pull request comment injection that can mislead reviewers or expose sensitive data.
- Runtime bundle divergence that causes reviewed source to differ from executed action behavior.
- Workflow permission weaknesses in this repository's own CI configuration.

Out of scope examples:

- Vulnerabilities in a caller's project build step before this action runs.
- Misconfigured third-party workflows that grant excessive permissions unrelated to this action's documented usage.
- Bundle-size increases or threshold policy decisions.
- Denial of service caused only by intentionally running the action on very large trusted artifacts in a trusted workflow.

## Secure Usage

- Configure the intended npm `package-name` and review reports for the resolved latest release version.
- Keep `files` and `output-file` relative to the configured `path` root.
- Use minimal workflow permissions. Generating reports should not need write permissions.
- Publish PR comments from external workflow steps that read the Markdown report. For public fork PRs, use a trusted `workflow_run` workflow rather than running PR-controlled code with writable credentials.
- Do not include generated files that may contain secrets in the configured `files` list.
- Pin third-party actions in workflows and avoid persisting checkout credentials unless needed.

## Security Design Reference

See [THREAT_MODEL.md](./THREAT_MODEL.md) for the current threat model, trust boundaries, existing controls, and open security questions.
