import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('action metadata declares the Node 24 runtime and dist entrypoint', async () => {
  const actionYaml = await readFile(path.join(root, 'action.yml'), 'utf8');

  assert.match(actionYaml, /^runs:\n  using: 'node24'\n  main: 'dist\/index\.js'$/m);
});

test('package manifest requires Node 24 and pnpm 11', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

  assert.equal(packageJson.engines.node, '>=24');
  assert.equal(packageJson.engines.pnpm, '>=11 <12');
  assert.equal(packageJson.packageManager, 'pnpm@11.1.2');
});
