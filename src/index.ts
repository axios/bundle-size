import * as core from '@actions/core';

/**
 * Main entrypoint for the Bundle Size Action.
 *
 * Currently logs a "Hello World" message together with the configured `path`
 * input.  All future bundle-size analysis logic should be added here (or
 * delegated to helper modules imported from this file).
 */
async function run(): Promise<void> {
  try {
    // Read the `path` input declared in action.yml.
    const targetPath = core.getInput('path', { required: false }) || '.';

    core.info('Hello World from Bundle Size Action');
    core.info(`Target path: ${targetPath}`);

    // TODO: add bundle-size analysis logic here.
    // Suggested extension points:
    //   - Build the project at `targetPath` and measure artifact sizes.
    //   - Compare sizes against a stored baseline.
    //   - Validate against a configurable threshold.
    //   - Post a summary comment on the pull request.
    //   - Upload a JSON size report as a workflow artifact.
    //   - Support multiple bundlers (Vite, Webpack, Next.js, …).

    core.setOutput('size', '0');
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
