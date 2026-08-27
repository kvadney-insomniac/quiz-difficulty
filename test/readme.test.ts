import { describe, it, expect } from 'vitest';
import { buildOptions, optionsFor } from '../src/index.js';

/**
 * The README prints a literal option list. For a library whose entire selling
 * point is that the same seed gives the same options forever, a README whose
 * output has drifted is not a cosmetic problem -- it is a counterexample to the
 * claim, sitting on the front page. So the documented example is executed here
 * and its documented output pinned.
 */

const ELEMENTS = [
  { name: 'Lithium', group: 1, period: 2 },
  { name: 'Sodium', group: 1, period: 3 },
  { name: 'Potassium', group: 1, period: 4 },
  { name: 'Rubidium', group: 1, period: 5 },
  { name: 'Caesium', group: 1, period: 6 },
  { name: 'Magnesium', group: 2, period: 3 },
  { name: 'Calcium', group: 2, period: 4 },
  { name: 'Aluminium', group: 13, period: 3 },
  { name: 'Silicon', group: 14, period: 3 },
  { name: 'Chlorine', group: 17, period: 3 },
  { name: 'Iron', group: 8, period: 4 },
  { name: 'Gold', group: 11, period: 6 },
];

const answer = 'Sodium';
const seed = 'q:alkali-metal-lamp';
const of = (n: string) => ELEMENTS.find((e) => e.name === n)!;

const sets = buildOptions({
  answer,
  seed,
  tiers: [
    {
      name: 'easy',
      wrongOptions: 2,
      rings: [() => ELEMENTS.filter((e) => e.group !== of(answer).group).map((e) => e.name)],
    },
    {
      name: 'medium',
      wrongOptions: 3,
      rings: [() => ELEMENTS.filter((e) => e.period === of(answer).period).map((e) => e.name)],
    },
    {
      name: 'hard',
      wrongOptions: 5,
      rings: [
        () => ELEMENTS.filter((e) => e.group === of(answer).group).map((e) => e.name),
        () => ELEMENTS.filter((e) => e.period === of(answer).period).map((e) => e.name),
        () => ELEMENTS.map((e) => e.name),
      ],
    },
  ],
});

describe('the example printed in the README', () => {
  it('still produces the exact option list the README says it produces', () => {
    expect(optionsFor(sets, 'hard', answer, seed)).toEqual([
      'Rubidium',
      'Potassium',
      'Sodium',
      'Caesium',
      'Lithium',
      'Aluminium',
    ]);
  });

  it('takes all four remaining alkali metals and tops up from the period ring', () => {
    // The README's stated reasoning, checked rather than asserted in prose:
    // only four other alkali metals exist, so a six-choice card cannot be
    // filled from group 1 alone. Abandoning group 1 to draw six from somewhere
    // wider is what would have made the hard question easy.
    const hard = sets.distractors['hard'] ?? [];
    expect(hard.slice(0, 4).sort()).toEqual(['Caesium', 'Lithium', 'Potassium', 'Rubidium']);
    expect(hard).toHaveLength(5);
    expect(ELEMENTS.filter((e) => e.period === 3).map((e) => e.name)).toContain(hard[4]!);
  });

  it('holds its own ordering: hard is not shorter than medium, medium not shorter than easy', () => {
    const size = (t: string) => (sets.distractors[t] ?? []).length;
    expect(size('medium')).toBeGreaterThanOrEqual(size('easy'));
    expect(size('hard')).toBeGreaterThanOrEqual(size('medium'));
  });
});
