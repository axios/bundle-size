const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('action metadata declares the Node 24 runtime and dist entrypoint', async () => {
  const actionYaml = await readFile(path.join(root, 'action.yml'), 'utf8');

  assert.match(actionYaml, /^runs:\n  using: 'node24'\n  main: 'dist\/index\.js'$/m);
});

test('package manifest requires Node 24 and pnpm 11', () => {
  const packageJson = require('../package.json');

  assert.equal(packageJson.engines.node, '>=24');
  assert.equal(packageJson.engines.pnpm, '>=11 <12');
  assert.equal(packageJson.packageManager, 'pnpm@11.1.2');
});
