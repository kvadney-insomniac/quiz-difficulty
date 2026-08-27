import { describe, it, expect } from 'vitest';
import { questions, answer, borrowed } from '../examples/geography.js';

/**
 * The example is executable documentation, so it is executed. Importing it runs
 * it (and prints the questions), which means `npx vitest run` catches the day
 * the README-shaped usage stops working -- the failure mode where the library
 * is fine but the way it is shown to newcomers is not.
 */
describe('examples/geography.ts', () => {
  it('renders three tiers of the same question', () => {
    expect(questions.map((q) => q.tier)).toEqual(['easy', 'medium', 'hard']);
  });

  it('offers the answer exactly once on every card', () => {
    for (const { options } of questions) {
      expect(options.filter((o) => o === answer)).toHaveLength(1);
    }
  });

  it('gives every tier a full four-choice card, so no tier is secretly the easy one', () => {
    for (const { options } of questions) expect(options).toHaveLength(4);
  });

  it('needs no borrowing: the rings are drawn wide enough for this corpus', () => {
    expect(borrowed).toEqual([]);
  });

  it('draws the hard tier from East Africa and the easy tier from other continents', () => {
    // The claim the example is making. If this ever inverts, the comments in the
    // example are lying to whoever reads them first.
    const eastAfrica = ['Kampala', 'Dodoma', 'Kigali', 'Mogadishu'];
    const hard = questions.find((q) => q.tier === 'hard')?.options ?? [];
    const easy = questions.find((q) => q.tier === 'easy')?.options ?? [];
    expect(hard.filter((o) => eastAfrica.includes(o)).length).toBe(3);
    expect(easy.some((o) => eastAfrica.includes(o))).toBe(false);
  });
});
