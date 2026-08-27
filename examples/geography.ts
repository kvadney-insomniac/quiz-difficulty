/**
 * A worked example: "What is the capital of Kenya?"
 *
 * Geography has an obvious notion of distance, which is what makes it a good
 * demonstration. Nairobi offered against Lisbon is not a hard question -- it is
 * a different subject, and the wrong option eliminates itself. Offered against
 * Kampala and Dodoma it is a real one, because you have to know the region
 * rather than merely recognise the continent.
 *
 * So the rings are drawn by region: neighbours first, then the rest of the
 * continent, then the world.
 *
 * Run it with `npx vitest run` (test/example.test.ts imports it) or directly
 * with `npx vite-node examples/geography.ts`.
 */
import { buildOptions, optionsFor, ringsWithin, type Ring } from '../src/index.js';

// The package ships zero dependencies and `lib` is ES2022 only, so there is no
// ambient `console`. Declaring it here keeps the example printable without
// pulling @types/node into a library that does not otherwise need it.

interface Capital {
  city: string;
  /** 0 = East Africa, 1 = rest of Africa, 2 = elsewhere in the world. */
  ring: number;
}

const ANSWER = 'Nairobi';
const SEED = 'geo:capital-of-kenya'; // stable identity for this question, never the clock

const capitals: Capital[] = [
  { city: 'Nairobi', ring: 0 }, { city: 'Kampala', ring: 0 }, { city: 'Dodoma', ring: 0 },
  { city: 'Kigali', ring: 0 }, { city: 'Mogadishu', ring: 0 },
  { city: 'Accra', ring: 1 }, { city: 'Rabat', ring: 1 },
  { city: 'Lusaka', ring: 1 }, { city: 'Windhoek', ring: 1 },
  { city: 'Lisbon', ring: 2 }, { city: 'Hanoi', ring: 2 },
  { city: 'Ottawa', ring: 2 }, { city: 'Canberra', ring: 2 },
];

// Rings by hand, for the easy tier. Nothing here is subtle: these are wrong on
// sight to anyone who knows which continent Kenya is on, which is the point of
// an easy tier. The second ring is the safety net -- a chain must always be
// able to widen, or a thin corpus quietly turns into a short card.
const farAway: Ring = () => capitals.filter((c) => c.ring === 2).map((c) => c.city);
const anywhere: Ring = () => capitals.map((c) => c.city);

// The same idea via `ringsWithin`, which is how you would normally spell it:
// give it a distance and the radii you want, tightest first. It appends an
// everything-ring itself, so these chains cannot run dry while candidates exist.
const label = (c: Capital) => c.city;
const distance = (c: Capital) => c.ring;
const sameContinent = ringsWithin(capitals, label, distance, [1]); // Africa, then the world
const sameRegion = ringsWithin(capitals, label, distance, [0]); // East Africa, then wider

const sets = buildOptions({
  answer: ANSWER,
  seed: SEED,
  // Easiest first -- the order is the contract. `buildOptions` will not let a
  // harder tier offer fewer choices than an easier one, because a three-choice
  // question is easier than a four-choice one however tight its distractors are.
  tiers: [
    { name: 'easy', wrongOptions: 3, rings: [farAway, anywhere] },
    { name: 'medium', wrongOptions: 3, rings: sameContinent },
    { name: 'hard', wrongOptions: 3, rings: sameRegion },
  ],
});

/** The rendered cards, exported so a test can check the example still holds up. */
export const questions = ['easy', 'medium', 'hard'].map((tier) => ({
  tier,
  options: optionsFor(sets, tier, ANSWER, SEED),
}));
export const answer = ANSWER;
export const borrowed = sets.borrowed;

console.log('What is the capital of Kenya?\n');
for (const { tier, options } of questions) console.log(`  ${tier.padEnd(6)} ${options.join('  /  ')}`);
console.log(`\n  borrowed from wider rings: ${borrowed.length ? borrowed.join(', ') : 'none'}`);
