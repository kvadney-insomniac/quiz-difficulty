#!/usr/bin/env node
// Fail on any em dash (U+2014) or en dash (U+2013) in tracked text files.
//
// The project removed every one of them in 1.1.2 and does not want them back.
// Run with no arguments to check every git-tracked file, or pass paths.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const BAD = new Map([
  [String.fromCharCode(0x2014), 'em dash'],
  [String.fromCharCode(0x2013), 'en dash'],
]);
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.ico', '.woff', '.woff2']);

const paths = process.argv.slice(2);
const files = paths.length
  ? paths
  : execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);

const hits = [];
for (const file of files) {
  if (BINARY.has(extname(file).toLowerCase())) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  text.split('\n').forEach((line, i) => {
    for (const [ch, label] of BAD) {
      if (line.includes(ch)) hits.push(`${file}:${i + 1}: ${label}`);
    }
  });
}

if (hits.length) {
  console.error(hits.join('\n'));
  process.exit(1);
}
console.log(`dash check: ${files.length} files, no em dash or en dash`);
