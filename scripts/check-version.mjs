#!/usr/bin/env node
// Version consistency check, run by CI.
//
// Three places name the release version and they drift independently:
//   1. package.json          "version"
//   2. package-lock.json     root "version" and packages[""].version
//   3. CHANGELOG.md          a "## [x.y.z] - YYYY-MM-DD" heading
// A fourth appears at release time: the git tag, which must be "v" + version.
//
// Exit 1 with a plain message on any mismatch. No dependencies, so it runs on
// a bare checkout before `npm ci` if need be.
//
// Semver grammar: https://semver.org/#backusnaur-form-grammar-for-valid-semver-versions
// CHANGELOG shape: https://keepachangelog.com/en/1.1.0/
import { readFileSync } from 'node:fs';

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const problems = [];
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const pkg = JSON.parse(read('package.json'));
const version = pkg.version;
if (typeof version !== 'string' || !SEMVER.test(version)) {
  problems.push(`package.json version "${version}" is not valid semver`);
}

const lock = JSON.parse(read('package-lock.json'));
if (lock.version !== version) {
  problems.push(`package-lock.json version "${lock.version}" does not match package.json "${version}"`);
}
const rootEntry = lock.packages?.[''];
if (rootEntry && rootEntry.version !== version) {
  problems.push(`package-lock.json packages[""].version "${rootEntry.version}" does not match package.json "${version}"`);
}

const changelog = read('CHANGELOG.md');
const heading = new RegExp(`^## \\[${version.replace(/[.+]/g, '\\$&')}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm');
if (!heading.test(changelog)) {
  problems.push(`CHANGELOG.md has no "## [${version}] - YYYY-MM-DD" heading`);
}
// On a tag build, the tag must be exactly v<version>, and nothing may still be
// sitting under [Unreleased].
const ref = process.env.GITHUB_REF ?? '';
if (ref.startsWith('refs/tags/')) {
  const tag = ref.slice('refs/tags/'.length);
  if (tag !== `v${version}`) {
    problems.push(`tag "${tag}" does not match package.json version "v${version}"`);
  }
  const unreleased = changelog.match(/^## \[Unreleased\]\s*\n([\s\S]*?)(?=^## |^\[[^\]]+\]: |(?![\s\S]))/m);
  if (unreleased && unreleased[1].trim() !== '') {
    problems.push('CHANGELOG.md still has entries under [Unreleased]; move them under the release heading before tagging');
  }
}

if (problems.length) {
  for (const p of problems) console.error(`version check: ${p}`);
  process.exit(1);
}
console.log(`version check: ${version} is consistent across package.json, package-lock.json and CHANGELOG.md`);
