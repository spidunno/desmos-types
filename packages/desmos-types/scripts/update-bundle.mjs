#!/usr/bin/env node
/**
 * Regenerates the internal types for a Desmos bundle and prepares a release.
 *
 *   npm run update:bundle -- path/to/calculator.js [--force] [--summary summary.md]
 *
 * 1. Reads the bundle's `Desmos.commit` (scripts/bundle-info.cjs). If
 *    package.json's `desmos.commit` already matches, there's nothing to do
 *    (unless --force).
 * 2. Runs the generators: extract-internals and snapshot-sketches.
 * 3. Runs `npm test`, which fails if the hand-written types no longer fit the
 *    regenerated ones.
 * 4. Bumps the patch version (also in the lockfile), records the commit in
 *    package.json, updates the README's install range and adds a CHANGELOG
 *    entry.
 *
 * It doesn't commit or publish. --summary writes a Markdown summary: what
 * changed in the generated types, and the test errors if there were any. In
 * GitHub Actions it also sets the step outputs `changed` (true/false), `tests`
 * (pass/fail), `commit`, `short` and `version`.
 *
 * A generator crashing exits with an error; failing tests don't.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const bundlePath = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--summary');
if (!bundlePath) {
  console.error('Usage: npm run update:bundle -- path/to/calculator.js [--force] [--summary summary.md]');
  process.exit(1);
}
const bundle = resolve(bundlePath);
const summaryPath = option('--summary');

/** Run a command in the package folder. Throws if `check` and it fails. */
function run(command, commandArgs, { check = true, capture = false } = {}) {
  // Under `npm run`, run npm's own CLI with node: no shell needed, even on Windows.
  const execPath = process.env.npm_execpath;
  const [cmd, cmdArgs] =
    command === 'npm' && execPath && /\.c?js$/.test(execPath)
      ? [process.execPath, [execPath, ...commandArgs]]
      : [command === 'npm' && process.platform === 'win32' ? 'npm.cmd' : command, commandArgs];
  const result = spawnSync(cmd, cmdArgs, {
    cwd: pkgDir,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    shell: process.platform === 'win32' && cmd === 'npm.cmd',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (check && result.status !== 0) {
    if (capture) process.stderr.write(result.stdout + result.stderr);
    throw new Error(`${command} ${commandArgs.join(' ')} failed`);
  }
  return result;
}

/** Set a GitHub Actions step output (no-op elsewhere). */
function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

// ---------------------------------------------------------------------------
// Is this a new commit?
// ---------------------------------------------------------------------------

const infoRun = run(process.execPath, ['scripts/bundle-info.cjs', bundle], { capture: true });
const info = JSON.parse(infoRun.stdout.trim().split('\n').pop());
const pkgPath = join(pkgDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const short = info.commit.slice(0, 7);

if (pkg.desmos?.commit === info.commit && !flag('--force')) {
  console.log(`Already up to date with Desmos ${info.version} commit ${short}.`);
  output('changed', 'false');
  process.exit(0);
}
console.log(`Desmos ${info.version} commit ${short} (was ${pkg.desmos?.commit?.slice(0, 7) ?? 'unknown'}).`);

// ---------------------------------------------------------------------------
// Regenerate
// ---------------------------------------------------------------------------

const generatedDir = join(pkgDir, 'internals', 'generated');
const generatedFiles = ['objects.d.ts', 'views.d.ts', 'actions.d.ts'];
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
const before = Object.fromEntries(generatedFiles.map((f) => [f, read(join(generatedDir, f))]));

run(process.execPath, ['scripts/extract-internals.cjs', bundle]);
run(process.execPath, ['scripts/snapshot-sketches.cjs', bundle]);

const after = Object.fromEntries(generatedFiles.map((f) => [f, read(join(generatedDir, f))]));

// ---------------------------------------------------------------------------
// What changed in the generated types
// ---------------------------------------------------------------------------

/** `Interface.member` -> its declaration, for every interface member. */
function members(text) {
  const out = new Map();
  let iface;
  for (const line of text.split('\n')) {
    let m;
    if ((m = line.match(/^  interface (\w+)/))) iface = m[1];
    else if (/^  }/.test(line)) iface = undefined;
    else if (iface && (m = line.match(/^    (?:readonly )?([\w$]+)\??[(:<]/))) out.set(`${iface}.${m[1]}`, line.trim());
  }
  return out;
}

/** `Union: "action-type"` for every action in the action unions. */
function actions(text) {
  const out = new Set();
  let union;
  for (const line of text.split('\n')) {
    let m;
    if ((m = line.match(/^  type (\w+) =/))) union = m[1];
    else if (union && (m = line.match(/\{ type: "([^"]+)"/))) out.add(`${union}: "${m[1]}"`);
  }
  return out;
}

const list = (items) => {
  const shown = items.slice(0, 40).map((i) => `- \`${i}\``);
  if (items.length > 40) shown.push(`- …and ${items.length - 40} more`);
  return shown.join('\n');
};

const oldMembers = new Map([...members(before['objects.d.ts']), ...members(before['views.d.ts'])]);
const newMembers = new Map([...members(after['objects.d.ts']), ...members(after['views.d.ts'])]);
const added = [...newMembers.keys()].filter((k) => !oldMembers.has(k));
const removed = [...oldMembers.keys()].filter((k) => !newMembers.has(k));
const retyped = [...newMembers.keys()].filter((k) => oldMembers.has(k) && oldMembers.get(k) !== newMembers.get(k));
const oldActions = actions(before['actions.d.ts']);
const newActions = actions(after['actions.d.ts']);
const addedActions = [...newActions].filter((a) => !oldActions.has(a));
const removedActions = [...oldActions].filter((a) => !newActions.has(a));

const changes = [
  ['Members added', added],
  ['Members removed', removed],
  ['Members with a different type', retyped],
  ['Actions added', addedActions],
  ['Actions removed', removedActions],
]
  .filter(([, items]) => items.length)
  .map(([title, items]) => `### ${title} (${items.length})\n\n${list(items)}`);

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

const test = run('npm', ['test'], { check: false, capture: true });
const passed = test.status === 0;
const errors = (test.stdout + test.stderr)
  .split('\n')
  .filter((l) => /error TS\d+/.test(l))
  .slice(0, 60);
console.log(passed ? 'Tests pass.' : `Tests fail:\n${errors.join('\n')}`);

// ---------------------------------------------------------------------------
// Version, changelog, README
// ---------------------------------------------------------------------------

// `npm version` also updates the root lockfile
run('npm', ['version', 'patch', '--no-git-tag-version'], { capture: true });
const bumped = JSON.parse(readFileSync(pkgPath, 'utf8'));
bumped.desmos = { version: info.version, commit: info.commit };
writeFileSync(pkgPath, JSON.stringify(bumped, null, 2) + '\n');
const version = bumped.version;

const readmePath = join(pkgDir, 'README.md');
const [major, minor] = version.split('.');
writeFileSync(readmePath, readFileSync(readmePath, 'utf8').replace(new RegExp(`~${major}\\.${minor}\\.\\d+`, 'g'), `~${version}`));

const date = new Date().toISOString().slice(0, 10);
const changesText = changes.length ? changes.join('\n\n') : 'No changes to the generated types.';
const entry = `## ${version} (${date})\n\nRegenerated for Desmos ${info.version}, commit \`${info.commit}\`.\n\n${changesText}\n`;
const changelogPath = join(pkgDir, 'CHANGELOG.md');
const changelog = read(changelogPath) || '# Changelog\n\nEach version records the Desmos commit its internal types were generated from.\n';
const [head, ...rest] = changelog.split(/\n(?=## )/);
writeFileSync(changelogPath, [head.trimEnd() + '\n', entry, ...rest].join('\n'));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (summaryPath) {
  const testText = passed
    ? 'The hand-written types still fit, so this can be published as is.'
    : [
        'The hand-written types no longer fit the regenerated ones. Fix them on this branch, and merging publishes it.',
        '',
        '```',
        ...errors,
        '```',
      ].join('\n');
  writeFileSync(
    summaryPath,
    `Desmos ${info.version} changed to commit \`${info.commit}\`. Regenerated as ${pkg.name}@${version}.\n\n` +
      `## Tests\n\n${testText}\n\n## Changes to the generated types\n\n${changesText}\n`,
  );
}

output('changed', 'true');
output('tests', passed ? 'pass' : 'fail');
output('commit', info.commit);
output('short', short);
output('version', version);
console.log(`Prepared ${pkg.name}@${version}.`);
