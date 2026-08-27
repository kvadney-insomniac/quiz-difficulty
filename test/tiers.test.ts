import { describe, it, expect } from 'vitest';
import {
  buildOptions,
  optionsFor,
  ringsWithin,
  ringsBeyond,
  type Ring,
  type Tier,
  type OptionSets,
} from '../src/index.js';

/**
 * The inversion this library exists to prevent.
 *
 * Tighten the pool for the hardest setting, discover it cannot fill the card,
 * render four choices instead of six, and the hardest setting is now the
 * easiest one on screen. Nothing throws; the label just means its opposite.
 * These tests are mostly about that one failure and the repairs around it.
 */

const ring = (...items: string[]): Ring => () => items;
const got = (sets: OptionSets, tier: string): string[] => sets.distractors[tier] ?? [];

/** Alkali/alkaline-earth/halogen symbols; distance is periods away from sodium. */
interface Element {
  sym: string;
  period: number;
}
const elements: Element[] = [
  { sym: 'Li', period: 2 },
  { sym: 'Na', period: 3 },
  { sym: 'K', period: 4 },
  { sym: 'Rb', period: 5 },
  { sym: 'Cs', period: 6 },
  { sym: 'Be', period: 2 },
  { sym: 'Mg', period: 3 },
  { sym: 'Ca', period: 4 },
  { sym: 'Sr', period: 5 },
  { sym: 'Ba', period: 6 },
  { sym: 'F', period: 2 },
  { sym: 'Cl', period: 3 },
  { sym: 'Br', period: 4 },
  { sym: 'I', period: 5 },
];
const sym = (e: Element) => e.sym;
const periodsFromSodium = (e: Element) => Math.abs(e.period - 3);

/** Three healthy tiers over a corpus rich enough that nobody has to borrow. */
const healthyTiers: Tier[] = [
  { name: 'easy', wrongOptions: 3, rings: ringsBeyond(elements, sym, periodsFromSodium, [2]) },
  { name: 'medium', wrongOptions: 3, rings: ringsWithin(elements, sym, periodsFromSodium, [2]) },
  { name: 'hard', wrongOptions: 3, rings: ringsWithin(elements, sym, periodsFromSodium, [0]) },
];

const build = (tiers: readonly Tier[], seed = 'element:Na') =>
  buildOptions({ answer: 'Na', seed, tiers });

describe('buildOptions, when the corpus is rich enough for every tier', () => {
  const sets = build(healthyTiers);

  it('gives each tier exactly the number of wrong options it asked for', () => {
    for (const tier of healthyTiers) {
      expect(got(sets, tier.name)).toHaveLength(tier.wrongOptions);
    }
  });

  it('never lets the answer appear among any tier’s wrong options', () => {
    for (const tier of healthyTiers) expect(got(sets, tier.name)).not.toContain('Na');
  });

  it('reports nothing as borrowed when every tier could fill itself from its own rings', () => {
    // A borrow is a signal that the subject matter is thin around this answer.
    // Reporting one here would be crying wolf and would mislead ring tuning.
    expect(sets.borrowed).toEqual([]);
  });

  it('gives no tier duplicate options within its own card', () => {
    for (const tier of healthyTiers) {
      const options = got(sets, tier.name);
      expect(new Set(options).size).toBe(options.length);
    }
  });

  it('does not collapse the tiers into one question wearing three names', () => {
    // The failure this whole design exists to avoid. If the tight tier and the
    // wide tier hand back the same strings, the difficulty setting is decorative.
    const easy = new Set(got(sets, 'easy'));
    const hard = new Set(got(sets, 'hard'));
    expect(hard).not.toEqual(easy);
    expect([...hard].some((option) => !easy.has(option))).toBe(true);
  });

  it('draws the hard tier from the answer’s own neighbourhood and the easy tier from outside it', () => {
    // Concretely: hard mode offers period-3 elements against a period-3 answer,
    // while easy mode offers elements two periods away that eliminate themselves.
    const near = new Set(
      elements.filter((e) => periodsFromSodium(e) === 0).map(sym),
    );
    expect(got(sets, 'hard').some((option) => near.has(option))).toBe(true);
    expect(got(sets, 'easy').every((option) => !near.has(option))).toBe(true);
  });

  it('returns byte-identical output when called twice with the same seed', () => {
    expect(JSON.stringify(build(healthyTiers))).toBe(JSON.stringify(build(healthyTiers)));
  });

  it('returns different options under a different seed, so a bank can be reshuffled deliberately', () => {
    expect(got(build(healthyTiers, 'seed-a'), 'medium')).not.toEqual(
      got(build(healthyTiers, 'seed-b'), 'medium'),
    );
  });
});

describe('buildOptions, when the hard tier’s rings genuinely run dry', () => {
  // Hand-built rings on purpose: no everything-ring at the end, so the hard
  // tier really can only find three candidates. This is the exact shape that
  // makes a naive implementation render a three-choice "hard" card next to a
  // six-choice "medium" one.
  const starved: Tier[] = [
    {
      name: 'easy',
      wrongOptions: 5,
      rings: [ring('far-1', 'far-2', 'far-3', 'far-4', 'far-5', 'far-6', 'far-7')],
    },
    {
      name: 'medium',
      wrongOptions: 5,
      rings: [ring('mid-1', 'mid-2', 'mid-3', 'mid-4', 'mid-5', 'mid-6')],
    },
    { name: 'hard', wrongOptions: 5, rings: [ring('near-1', 'near-2', 'near-3')] },
  ];
  const sets = build(starved);

  it('does not leave the hard tier shorter than medium, which would invert the difficulty', () => {
    expect(got(sets, 'hard').length).toBeGreaterThanOrEqual(got(sets, 'medium').length);
    expect(got(sets, 'medium').length).toBeGreaterThanOrEqual(got(sets, 'easy').length);
    expect(got(sets, 'hard')).toHaveLength(5);
  });

  it('names the starved tier in borrowed, and only that tier', () => {
    expect(sets.borrowed).toEqual(['hard']);
  });

  it('keeps all three close candidates and tops up from elsewhere, rather than replacing them', () => {
    // Widening must add to the close candidates, never swap them out. Replacing
    // them would discard the very options that made the question hard, and it
    // would do it exactly when good candidates are scarcest.
    for (const near of ['near-1', 'near-2', 'near-3']) {
      expect(got(sets, 'hard')).toContain(near);
    }
    expect(got(sets, 'hard').slice(0, 3).sort()).toEqual(['near-1', 'near-2', 'near-3']);
  });

  it('still keeps the answer out of the borrowed top-up', () => {
    const withAnswerEverywhere = build([
      { name: 'easy', wrongOptions: 4, rings: [ring('Na', 'far-1', 'far-2', 'far-3', 'far-4')] },
      { name: 'hard', wrongOptions: 4, rings: [ring('Na', 'near-1')] },
    ]);
    expect(got(withAnswerEverywhere, 'hard')).not.toContain('Na');
    expect(got(withAnswerEverywhere, 'easy')).not.toContain('Na');
  });

  it('gives no tier duplicate options after borrowing', () => {
    const options = got(sets, 'hard');
    expect(new Set(options).size).toBe(options.length);
  });

  it('borrows deterministically, so a starved question is still stable across builds', () => {
    expect(JSON.stringify(build(starved))).toBe(JSON.stringify(build(starved)));
  });
});

describe('buildOptions, on degenerate inputs that must not throw', () => {
  const monotonic = (sets: OptionSets, names: readonly string[]) => {
    let floor = 0;
    for (const n of names) {
      expect(got(sets, n).length).toBeGreaterThanOrEqual(floor);
      floor = got(sets, n).length;
    }
  };

  it('survives a corpus with no candidates at all, returning empty cards rather than failing', () => {
    const sets = build([
      { name: 'easy', wrongOptions: 3, rings: [ring()] },
      { name: 'hard', wrongOptions: 3, rings: [ring()] },
    ]);
    expect(got(sets, 'easy')).toEqual([]);
    expect(got(sets, 'hard')).toEqual([]);
  });

  it('survives exactly one candidate, keeping both tiers the same length', () => {
    const sets = build([
      { name: 'easy', wrongOptions: 3, rings: [ring('only')] },
      { name: 'hard', wrongOptions: 3, rings: [ring('only')] },
    ]);
    expect(got(sets, 'easy')).toEqual(['only']);
    monotonic(sets, ['easy', 'hard']);
  });

  it('survives a candidate pool holding nothing but the answer', () => {
    const sets = build([{ name: 'only-tier', wrongOptions: 3, rings: [ring('Na', 'Na')] }]);
    expect(got(sets, 'only-tier')).toEqual([]);
  });

  it('treats wrongOptions: 0 as a card with no distractors, not as a request for one', () => {
    const sets = build([
      { name: 'easy', wrongOptions: 0, rings: [ring('a', 'b', 'c')] },
      { name: 'hard', wrongOptions: 0, rings: [ring('a', 'b', 'c')] },
    ]);
    expect(got(sets, 'easy')).toEqual([]);
    expect(got(sets, 'hard')).toEqual([]);
    expect(sets.borrowed).toEqual([]);
  });

  it('handles a single tier, where there is no ordering to enforce', () => {
    const sets = build([{ name: 'solo', wrongOptions: 3, rings: [ring('a', 'b', 'c', 'd')] }]);
    expect(got(sets, 'solo')).toHaveLength(3);
    expect(sets.borrowed).toEqual([]);
  });

  it('handles no tiers at all', () => {
    const sets = build([]);
    expect(sets.distractors).toEqual({});
    expect(sets.borrowed).toEqual([]);
  });

  it('handles every tier asking for the same count', () => {
    const same: Tier[] = ['easy', 'medium', 'hard'].map((name) => ({
      name,
      wrongOptions: 3,
      rings: ringsWithin(elements, sym, periodsFromSodium, [1]),
    }));
    const sets = build(same);
    for (const tier of same) expect(got(sets, tier.name)).toHaveLength(3);
    monotonic(sets, ['easy', 'medium', 'hard']);
  });

  it('keeps the ordering across a longer ladder of tiers, each tighter than the last', () => {
    const ladder: Tier[] = [
      { name: 't1', wrongOptions: 4, rings: [ring('a1', 'a2', 'a3', 'a4', 'a5')] },
      { name: 't2', wrongOptions: 4, rings: [ring('b1', 'b2', 'b3', 'b4')] },
      { name: 't3', wrongOptions: 4, rings: [ring('c1', 'c2', 'c3')] },
      { name: 't4', wrongOptions: 4, rings: [ring('d1', 'd2')] },
    ];
    const sets = build(ladder);
    monotonic(sets, ['t1', 't2', 't3', 't4']);
    expect(sets.borrowed).toEqual(['t3', 't4']);
  });
});

describe('optionsFor', () => {
  const sets = build(healthyTiers);

  it('includes the answer exactly once', () => {
    const options = optionsFor(sets, 'medium', 'Na', 'element:Na');
    expect(options.filter((o) => o === 'Na')).toHaveLength(1);
  });

  it('includes every one of that tier’s wrong options, losing none to the shuffle', () => {
    const options = optionsFor(sets, 'hard', 'Na', 'element:Na');
    expect([...options].sort()).toEqual([...got(sets, 'hard'), 'Na'].sort());
    expect(options).toHaveLength(got(sets, 'hard').length + 1);
  });

  it('returns the same order every time for a fixed seed, so a cached render stays valid', () => {
    expect(optionsFor(sets, 'easy', 'Na', 'element:Na')).toEqual(
      optionsFor(sets, 'easy', 'Na', 'element:Na'),
    );
  });

  it('puts the answer in different slots for different seeds, so it is shuffled and not appended', () => {
    // Appending the answer would pass every other test here while making the
    // answer trivially findable: it would always be last.
    const positions = new Set<number>();
    for (let i = 0; i < 20; i++) {
      positions.add(optionsFor(sets, 'hard', 'Na', `seed-${i}`).indexOf('Na'));
    }
    expect(positions.size).toBeGreaterThan(1);
    expect(positions.has(-1)).toBe(false);
  });

  it('folds the tier name into the shuffle, so the answer does not sit in lockstep across cards', () => {
    // Without the tier in the ordering seed, every tier of a question would put
    // the answer in the same slot, and someone working through easy then hard
    // could find it by habit. Any single question can of course collide by
    // chance across four slots, so this looks across a run of questions.
    const differed = Array.from({ length: 10 }, (_, i) => {
      const seed = `question-${i}`;
      return (
        optionsFor(sets, 'easy', 'Na', seed).indexOf('Na') !==
        optionsFor(sets, 'hard', 'Na', seed).indexOf('Na')
      );
    });
    expect(differed).toContain(true);
  });

  it('returns just the answer for a tier name that does not exist, rather than throwing', () => {
    expect(optionsFor(sets, 'no-such-tier', 'Na', 'element:Na')).toEqual(['Na']);
  });

  it('returns just the answer when the tier has no wrong options', () => {
    const empty = build([{ name: 'solo', wrongOptions: 0, rings: [ring('a', 'b')] }]);
    expect(optionsFor(empty, 'solo', 'Na', 'element:Na')).toEqual(['Na']);
  });
});
