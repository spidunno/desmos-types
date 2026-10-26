#!/usr/bin/env node
/**
 * Prints the `Desmos.version`, `Desmos.commit` and SHA-256 of a Desmos
 * `calculator.js` bundle as JSON, on the last line of output.
 *
 *   node scripts/bundle-info.cjs path/to/calculator.js
 *
 * The commit isn't a literal in the bundle, so the bundle is loaded in jsdom
 * to read it. Only run this on a bundle downloaded from desmos.com.
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { loadDesmos } = require('./lib/jsdom-desmos.cjs');

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error('Usage: node scripts/bundle-info.cjs path/to/calculator.js');
  process.exit(1);
}

const source = fs.readFileSync(bundlePath, 'utf8');
const sha256 = crypto.createHash('sha256').update(source).digest('hex');
const { Desmos } = loadDesmos(source);
console.log(JSON.stringify({ version: Desmos.version, commit: Desmos.commit, sha256 }));
// jsdom's timers would keep the process alive
process.exit(0);
