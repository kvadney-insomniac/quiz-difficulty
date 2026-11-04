#!/usr/bin/env node
// Print one release's section of CHANGELOG.md, for the GitHub Release body.
//
//   node scripts/release-notes.mjs           # the version in package.json
//   node scripts/release-notes.mjs 1.1.3     # a specific version
//
// Exits 1 if the section is missing, so a tag build cannot ship empty notes.
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const version = process.argv[2] ?? JSON.parse(read('package.json')).version;
const lines = read('CHANGELOG.md').split('\n');

const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`release notes: no "## [${version}]" section in CHANGELOG.md`);
  process.exit(1);
}
let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
if (end === -1) end = lines.findIndex((l, i) => i > start && /^\[[^\]]+\]: /.test(l));
if (end === -1) end = lines.length;

const body = lines.slice(start + 1, end).join('\n').trim();
const compare = lines.find((l) => l.startsWith(`[${version}]: `))?.slice(`[${version}]: `.length);

process.stdout.write(body + '\n');
if (compare) process.stdout.write(`\nFull diff: ${compare}\n`);
