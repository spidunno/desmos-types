#!/usr/bin/env node
/**
 * Publishes every public workspace whose current version isn't on npm yet,
 * dependencies first.
 *
 *   npm run release                  # publish what's new
 *   npm run release -- --dry-run     # show what would be published
 *   npm run release -- --otp=123456  # extra arguments go to `npm publish`
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function npm(npmArgs, options = {}) {
  // Under `npm run`, run npm's own CLI with node: no shell needed, even on Windows.
  const execPath = process.env.npm_execpath;
  if (execPath && /\.c?js$/.test(execPath))
    return spawnSync(process.execPath, [execPath, ...npmArgs], { encoding: 'utf8', ...options });
  return spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', npmArgs, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  });
}

// Workspaces, assuming the root `workspaces` entries are `dir/*` globs.
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const packages = rootPkg.workspaces
  .flatMap((pattern) => {
    const dir = join(root, pattern.replace(/\/\*$/, ''));
    return readdirSync(dir).map((name) => join(dir, name));
  })
  .filter((dir) => existsSync(join(dir, 'package.json')))
  .map((dir) => ({ dir, pkg: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) }))
  .filter(({ pkg }) => !pkg.private);

// Dependencies first, so a package is never published before one it builds from.
const names = new Set(packages.map(({ pkg }) => pkg.name));
const internalDeps = ({ pkg }) =>
  Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }).filter((n) => names.has(n));
const ordered = [];
const visit = (p, seen = new Set()) => {
  if (ordered.includes(p)) return;
  if (seen.has(p)) throw new Error(`Dependency cycle at ${p.pkg.name}`);
  seen.add(p);
  for (const dep of internalDeps(p)) visit(packages.find(({ pkg }) => pkg.name === dep), seen);
  ordered.push(p);
};
packages.forEach((p) => visit(p));

function isPublished({ name, version }) {
  const result = npm(['view', `${name}@${version}`, 'version', '--json']);
  if (result.status === 0) return result.stdout.trim() !== '';
  if (/"code":\s*"E404"/.test(result.stdout + result.stderr)) return false;
  throw new Error(`npm view ${name}@${version} failed:\n${result.stdout}${result.stderr}`);
}

const toPublish = ordered.filter(({ pkg }) => {
  const published = isPublished(pkg);
  console.log(`${published ? '  up to date ' : '  new        '} ${pkg.name}@${pkg.version}`);
  return !published;
});

if (!toPublish.length) {
  console.log('Nothing to publish.');
  process.exit(0);
}

for (const { dir, pkg } of toPublish) {
  console.log(`\n${dryRun ? 'Would publish' : 'Publishing'} ${pkg.name}@${pkg.version}`);
  const result = npm(['publish', ...args], { cwd: dir, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\nFailed to publish ${pkg.name}@${pkg.version}; stopping.`);
    process.exit(result.status ?? 1);
  }
}
