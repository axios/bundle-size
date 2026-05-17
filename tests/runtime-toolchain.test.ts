import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

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

test('package manifest uses Vite, Vitest, Oxlint, and no ncc workflow', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

  assert.equal(packageJson.scripts.lint, 'oxlint src tests vite.config.ts vitest.config.ts');
  assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit');
  assert.equal(packageJson.scripts.test, 'vitest run');
  assert.equal(packageJson.scripts.build, 'vite build');
  assert.equal(packageJson.scripts.clean, 'rimraf dist');
  assert.equal(packageJson.devDependencies.vite, '8.0.10');
  assert.equal(packageJson.devDependencies.vitest, '4.1.6');
  assert.equal(packageJson.devDependencies.oxlint, '1.65.0');
  assert.equal(packageJson.devDependencies['@vercel/ncc'], undefined);
});

test('TypeScript config explicitly loads Node ambient types', async () => {
  const tsconfig = JSON.parse(await readFile(path.join(root, 'tsconfig.json'), 'utf8'));

  assert.deepEqual(tsconfig.compilerOptions.types, ['node']);
  assert.equal(tsconfig.compilerOptions.moduleResolution, 'Bundler');
  assert.equal(tsconfig.compilerOptions.noEmit, true);
  assert.deepEqual(tsconfig.compilerOptions.paths, { '@/*': ['src/*'] });
});
