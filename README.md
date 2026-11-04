# quiz-difficulty

Build easy/medium/hard options for multiple-choice questions. Deterministic, and
guaranteed not to make hard mode easier.

## Install

```bash
npm install quiz-difficulty
```

Requirements: Node 18 or later, as declared in `engines` in `package.json`.
The package is ES modules only, ships its own TypeScript declarations, and has
no runtime dependencies. Nothing in `src/` touches a Node API, so it runs
unchanged in a browser bundle.

To try it from a clone instead:

```bash
git clone https://github.com/kvadney-insomniac/quiz-difficulty.git
cd quiz-difficulty
npm ci
npm run example
```

`npm run example` runs `examples/geography.ts` through the test runner and
prints three tiers of "What is the capital of Kenya?".

## The problem

Most difficulty settings are one knob over one pool of wrong answers. That
breaks in a specific and quiet way.

Say your hardest tier draws its wrong options from as close to the answer as it
can get. That is the right instinct. A wrong option is only doing work if it is *plausible*.
"Which book is Leviticus 10 in?" offered against Colossians is not a hard
question, it is a different subject: the wrong option eliminates itself and the
question collapses to a guess among whatever is left.

But tighten far enough and one day the tight pool has only three candidates when
your hard tier wanted five. Now hard renders four choices where medium renders
six. **Your hardest setting is the easiest one on screen.** Nothing throws.
Nothing logs. The setting simply means the opposite of its label, and the only
symptom is that people score better on hard.

This library exists to make that impossible.

## A two-minute example

Describe your candidates as **rings** around the answer, tightest first. Declare
your **tiers** easiest first. The library does the rest.

The example below is executed by the test suite (`test/readme.test.ts`), so the
printed output is pinned rather than hoped for.

```ts
import { buildOptions, optionsFor } from 'quiz-difficulty';

const ELEMENTS = [
  { name: 'Lithium',   group: 1,  period: 2 },
  { name: 'Sodium',    group: 1,  period: 3 },
  { name: 'Potassium', group: 1,  period: 4 },
  { name: 'Rubidium',  group: 1,  period: 5 },
  { name: 'Caesium',   group: 1,  period: 6 },
  { name: 'Magnesium', group: 2,  period: 3 },
  { name: 'Calcium',   group: 2,  period: 4 },
  { name: 'Aluminium', group: 13, period: 3 },
  { name: 'Silicon',   group: 14, period: 3 },
  { name: 'Chlorine',  group: 17, period: 3 },
  { name: 'Iron',      group: 8,  period: 4 },
  { name: 'Gold',      group: 11, period: 6 },
];

const answer = 'Sodium';
const of = (n: string) => ELEMENTS.find((e) => e.name === n)!;

const sets = buildOptions({
  answer,
  seed: 'q:alkali-metal-lamp',
  tiers: [
    {
      name: 'easy',
      wrongOptions: 2,
      // Anything from a different group: wrong on sight if you know any
      // chemistry at all.
      rings: [() => ELEMENTS.filter((e) => e.group !== of(answer).group).map((e) => e.name)],
    },
    {
      name: 'medium',
      wrongOptions: 3,
      // Same period. Related, but not the thing being tested.
      rings: [() => ELEMENTS.filter((e) => e.period === of(answer).period).map((e) => e.name)],
    },
    {
      name: 'hard',
      wrongOptions: 5,
      // Same group, the other alkali metals. You have to actually know it.
      // If that runs short, widen to the same period rather than short the card.
      rings: [
        () => ELEMENTS.filter((e) => e.group === of(answer).group).map((e) => e.name),
        () => ELEMENTS.filter((e) => e.period === of(answer).period).map((e) => e.name),
        () => ELEMENTS.map((e) => e.name),
      ],
    },
  ],
});

optionsFor(sets, 'hard', answer, 'q:alkali-metal-lamp');
// => ['Rubidium', 'Potassium', 'Sodium', 'Caesium', 'Lithium', 'Aluminium']
//
// Only four other alkali metals exist, so the tight ring cannot fill a
// six-choice card. It takes all four and tops up with one element from the
// next ring out -- rather than abandoning the tight ring and drawing six
// from somewhere wider, which is what would have made the question easy.
```

`sets.borrowed` names any tier that could not fill itself from its own rings and
had to widen to stay in order. That is not an error, widening is the correct
repair, but it tells you the subject matter is thinner around that answer than
the tier assumed, which is exactly what you want to know when tuning rings.

## What it guarantees

**Tiers never invert.** Walking easiest to hardest, no tier offers fewer options
than the one before it. A tier that falls short borrows rather than shipping a
short card.

**Options are deterministic.** Every choice is a pure function of the seed you
supply. Same seed, same options, forever.

That second one matters more than it sounds. Question banks get regenerated
whenever a data file changes and the build runs again. If the wrong options
moved each time, anything keyed to a question would come unstuck: a
spaced-repetition schedule, a record of what someone got wrong, a cached render.
Seed with something stable about the question, never with the clock.

**The answer never appears among its own distractors**, and duplicates are
collapsed. Two identical wrong options read as a bug, and they quietly cost the
question a distinct choice.

## Rings from a distance function

When "closeness" is numeric, you do not have to write the filters:

```ts
import { ringsWithin, ringsBeyond } from 'quiz-difficulty';

const distance = (c: Capital) => Math.abs(c.latitude - answerLatitude);

// Tightest first: within 5 degrees, then 15, then everything.
const hardRings = ringsWithin(CAPITALS, (c) => c.name, distance, [5, 15]);

// Widest first: more than 40 degrees away, then more than 20, then everything.
const easyRings = ringsBeyond(CAPITALS, (c) => c.name, distance, [40, 20]);
```

Distance is whatever your subject makes it, position in an ordered corpus,
taxonomic depth, year, category nesting, edit distance. The library has no
opinion, which is the point.

Both helpers always end with a ring containing everything, so a chain can never
run dry while candidates still exist.

## API

| | |
|---|---|
| `buildOptions({ answer, seed, tiers })` | Wrong options per tier, plus `borrowed` |
| `optionsFor(sets, tier, answer, seed)` | Full option list, answer included, stably shuffled |
| `pickAcrossRings(rings, answer, n, seed, seedForRing?)` | Take from the tightest ring first, widening only for a shortfall |
| `layeredPool(rings, answer, n)` | First ring that can supply `n`, else the widest seen |
| `ringsWithin(items, label, distance, radii)` | Rings tightening inward |
| `ringsBeyond(items, label, distance, radii)` | Rings widening outward |
| `pickDistractors(pool, answer, n, seed)` | Seeded pick, answer excluded, deduped |
| `seededShuffle(arr, seed)` | Deterministic Fisher-Yates |
| `defaultRingSeed(seed, i)` | The default per-ring derivation, if you want to wrap it |
| `hashString(s)` / `mulberry32(seed)` | The primitives, if you want them |

## Adopting it into a bank that already exists

If your options are already baked into content people have studied, the default
seed derivation will reshuffle every wrong answer you have ever shown. That is
not a bug, but it is a migration nobody asked for, and it lands on learners as
"the answers moved".

So pass `seedForRing` and reproduce whatever your bank already did:

```ts
buildOptions({
  answer, seed, tiers,
  // Whatever your prior implementation used. This one seeded its default tier
  // from the bare question seed and suffixed the others.
  seedForRing: (s) => (s.endsWith(':medium') ? s.slice(0, -':medium'.length) : s),
});
```

Adopt byte-identically first, then drop the override on your own schedule when a
reshuffle is something you can afford.

## What this is not

Not a question generator, you bring the candidates. Not a scheduler; pair it
with an SRS if you need one. It has no opinion about how you store questions,
and no runtime dependencies.

## FAQ

**My hard tier shows an option from a wider ring. Is that a bug?**
No. A tier takes everything it can from its tightest ring and tops up from the
next one out. The alternative, drawing the whole card from the wider ring, is
what makes the hard question easy, because it discards the close candidates
exactly when they are scarce. If you would rather know when it happens, it is
reported only when a tier's *entire* chain runs dry: see the next question.

**What does `borrowed` mean, and should I treat it as an error?**
`sets.borrowed` lists tiers whose whole chain of rings could not fill them, so
they drew from the pooled candidates of every tier to keep the ordering
guarantee. It is a signal about your data, not a failure: the subject is
thinner around that answer than the tier assumed. Widening *within* a chain is
not reported, because that is the chain working as designed.

**Why do I get the same options every time?**
By design. Every choice is a pure function of the `seed` you pass. Change the
seed and the options change; keep it and they stay put across rebuilds, which
is what keeps a spaced-repetition schedule or a cached render attached to its
question. Seed with something stable about the question, never the clock.

**I have an existing question bank. Will adopting this reshuffle my options?**
Only if you let it. Pass `seedForRing` to reproduce the derivation your bank
already used and the output is byte-identical; drop the override later when a
reshuffle is something you can afford. See "Adopting it into a bank that
already exists" above.

**Can I use it from CommonJS?**
The package is ES modules only. Node 20.19 and 22.12 or later can `require()`
an ES module directly, per the
[Node.js modules documentation](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require).
On Node 18, use `import()` from CommonJS instead.

**Which random number generator does it use, and is it cryptographic?**
Seeds are hashed with
[FNV-1a](http://www.isthe.com/chongo/tech/comp/fnv/) and the hash drives
[mulberry32](https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32),
a 32-bit PRNG, through a Fisher-Yates shuffle. Neither is cryptographic and
neither needs to be: the goal is a stable, well-spread shuffle, not secrecy.
Both are exported (`hashString`, `mulberry32`) if you want them.

**Does `wrongOptions` include the answer?**
No. It is the number of wrong options alongside the answer, so a tier with
`wrongOptions: 3` renders a four-choice card from `optionsFor`.

**What if a ring returns duplicates, empty strings, or the answer itself?**
All three are dropped before anything is counted. Two identical wrong options
read as a bug, and the answer can never appear among its own distractors.

**Does the package have runtime dependencies?**
None. `dist/` imports nothing outside itself; the dev dependencies are
TypeScript, vitest and ESLint.

**How do I run the checks locally?**

```bash
npm run check          # typecheck
npm run lint           # ESLint, plus a check that no em or en dash crept in
npm test               # vitest
npm run check-version  # package.json, package-lock.json and CHANGELOG.md agree
npm run build          # emit dist/
```

## Releases

Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and
every release is recorded in [CHANGELOG.md](./CHANGELOG.md). A release is a
`v<version>` tag on `main`; the `release` workflow verifies the tag matches
`package.json` and the changelog, runs every check, and creates a GitHub
Release with the changelog section as its notes and the packed tarball
attached. Publishing to npm is a separate manual step.

## Provenance

Extracted from a Bible-survey trainer where the difficulty setting was found to
be doing almost nothing: two thirds of a 6,000-question bank carried no
alternate option sets at all and silently fell back to the default, so the
"hard" setting went on offering New Testament options against Old Testament
questions, 637 of them, measured. Fixing that surfaced the inversion problem
twice, in different question families, which is what convinced me the guarantee
belonged in a library rather than in a code review checklist.

## License

MIT.
