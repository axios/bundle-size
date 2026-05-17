import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'vitest';

import { shouldRunEntrypoint } from '@/index';

test('shouldRunEntrypoint runs inside GitHub Actions action steps with inputs', () => {
  assert.equal(
    shouldRunEntrypoint(undefined, { GITHUB_ACTIONS: 'true', INPUT_FILES: 'index.js' }),
    true,
  );
});

test('shouldRunEntrypoint skips non-action GitHub Actions steps without inputs', () => {
  assert.equal(shouldRunEntrypoint(undefined, { GITHUB_ACTIONS: 'true' }), false);
});

test('shouldRunEntrypoint runs for the bundled dist entrypoint', () => {
  assert.equal(
    shouldRunEntrypoint(path.join('/actions', 'bundle-size', 'dist', 'index.js'), {}),
    true,
  );
});

test('shouldRunEntrypoint skips regular imports outside GitHub Actions', () => {
  assert.equal(shouldRunEntrypoint(path.join('/project', 'tests', 'index.test.ts'), {}), false);
});
