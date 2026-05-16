import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  normalizeConfiguredPath,
  parseFilePaths,
  resolveInsideRoot,
} from '../lib/paths.js';

test('normalizeConfiguredPath normalizes trimmed relative paths', () => {
  assert.equal(normalizeConfiguredPath(' ./dist\\a.js '), 'dist/a.js');
  assert.equal(normalizeConfiguredPath('dist//nested/../a.js'), 'dist/a.js');
});

test('normalizeConfiguredPath rejects empty and unsafe paths', () => {
  assert.throws(() => normalizeConfiguredPath(''), /must not be empty/);
  assert.throws(() => normalizeConfiguredPath('.'), /must not be empty/);
  assert.throws(() => normalizeConfiguredPath('/dist/a.js'), /must be relative/);
  assert.throws(() => normalizeConfiguredPath('../dist/a.js'), /must be relative/);
  assert.throws(() => normalizeConfiguredPath('C:\\dist\\a.js'), /must be relative/);
  assert.throws(() => normalizeConfiguredPath('C:/dist/a.js'), /must be relative/);
  assert.throws(() => normalizeConfiguredPath('\\\\server\\share\\a.js'), /must be relative/);
  assert.throws(() => normalizeConfiguredPath('//server/share/a.js'), /must be relative/);
});

test('parseFilePaths returns normalized unique relative paths', () => {
  assert.deepEqual(parseFilePaths('dist/a.js\n./dist/a.js\ndist/b.js\n'), [
    'dist/a.js',
    'dist/b.js',
  ]);
});

test('parseFilePaths rejects missing paths', () => {
  assert.throws(() => parseFilePaths('\n'), /At least one file path/);
});

test('resolveInsideRoot resolves child paths and rejects root or traversal', () => {
  const root = path.join(os.tmpdir(), 'bundle-size-root');

  assert.equal(resolveInsideRoot(root, 'dist/a.js'), path.join(root, 'dist/a.js'));
  assert.equal(resolveInsideRoot(root, '..foo/a.js'), path.join(root, '..foo/a.js'));
  assert.throws(() => resolveInsideRoot(root, '../a.js'), /stay inside/);
  assert.throws(() => resolveInsideRoot(root, '..'), /stay inside/);
  assert.throws(() => resolveInsideRoot(root, '.'), /stay inside/);
  assert.throws(() => resolveInsideRoot(root, root), /stay inside/);
});
