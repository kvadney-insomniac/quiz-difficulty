# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
Each release is tagged `v<version>`; the tag, `package.json`, `package-lock.json`
and the heading below must agree, and CI checks that they do.

## [Unreleased]

## [1.1.3] - 2026-11-03

No change to the published runtime code. This release adds the tooling around it.

### Added

- `CHANGELOG.md`, with entries reconstructed from the git history.
- ESLint (flat config, `typescript-eslint` type-checked rules) over `src`,
  `test` and `examples`, run as `npm run lint`.
- `scripts/check-dashes.mjs`: fails if an em dash or en dash appears in any
  tracked file. Runs as part of `npm run lint`.
- `scripts/check-version.mjs`: fails if `package.json`, `package-lock.json`
  and `CHANGELOG.md` disagree about the version, or if a tag does not match.
  Runs as `npm run check-version`.
- `scripts/release-notes.mjs`: prints one release's section of this file.
- A `release` workflow that runs on a `v*` tag: checks the version, runs
  lint, typecheck, tests and build, packs the tarball, and creates a GitHub
  Release with the notes from this file and the tarball attached. It does not
  publish to npm; that stays a manual step.
- `npm run example` to run and print `examples/geography.ts`.
- README: Install and Requirements, a two-minute example, an FAQ, and a
  Releases section.

### Changed

- CI now has a `lint` job (ESLint, dash check, version check) alongside the
  existing typecheck, test and build matrix on Node 20 and 22.
- `prepublishOnly` also runs `npm run lint`.
- The stale `npx vite-node` instruction in `examples/geography.ts` is replaced
  with `npm run example`; vitest 4 no longer ships `vite-node`. A leftover
  comment about declaring `console`, which nothing declared, is removed.

### Fixed

- `npm audit` is clean again. `vite` (a dev dependency pulled in by vitest)
  moves from 6.4.4 to 8.3.5, which clears
  [GHSA-8g5g-mxqh-grgj](https://github.com/advisories/GHSA-8g5g-mxqh-grgj).
  `minimatch` is pinned to 11.0.1 or later via `overrides` so that the ESLint
  dependency tree does not reintroduce
  [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## [1.1.2] - 2026-08-28

### Changed

- Every em dash in the README and source comments is removed and the affected
  sentences rephrased (commit `30fa526`).

## [1.1.1] - 2026-08-27

### Fixed

- `dist/` is now built on `prepare` as well as `prepublishOnly`, so an
  `npm install <git-url>` of this repository gets a usable package instead of
  a `main` that points at files that were never built (commit `616d196`).

## [1.1.0] - 2026-08-27

### Added

- `seedForRing` on `buildOptions` and `pickAcrossRings`, so an existing
  question bank can adopt the library and reproduce its prior shuffle
  byte-identically instead of reshuffling every wrong answer learners have
  already seen. `defaultRingSeed` is exported for callers who want to wrap
  the default (commit `d6c3244`).

## [1.0.0] - 2026-08-27

First stable release. The API had been through a clean-room extraction, a
redesign of how rings widen, and two defects found by its own test suite, so
the version says the shape has stopped moving (commit `56938f4`).

### Added

- `buildOptions` and `optionsFor`: tiers declared easiest first, and the
  guarantee that no tier ends up offering fewer options than an easier one.
  A tier that cannot fill itself borrows and is named in `borrowed`.
- `pickAcrossRings`: take from the tightest ring first and widen only for the
  shortfall, so widening tops up rather than replaces.
- `layeredPool`, `ringsWithin`, `ringsBeyond`.
- `pickDistractors`, `seededShuffle`, `hashString` (FNV-1a) and `mulberry32`.
- Package metadata for publishing: `repository`, `homepage`, `bugs`,
  `sideEffects: false`, `engines.node >= 18`, and a `prepublishOnly` that
  typechecks, tests and builds (commit `c0f6ab1`).

[Unreleased]: https://github.com/kvadney-insomniac/quiz-difficulty/compare/v1.1.3...HEAD
[1.1.3]: https://github.com/kvadney-insomniac/quiz-difficulty/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/kvadney-insomniac/quiz-difficulty/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/kvadney-insomniac/quiz-difficulty/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/kvadney-insomniac/quiz-difficulty/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/kvadney-insomniac/quiz-difficulty/releases/tag/v1.0.0
