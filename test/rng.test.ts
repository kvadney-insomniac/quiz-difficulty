import { describe, it, expect } from 'vitest';
import { hashString, mulberry32, seededShuffle, pickDistractors } from '../src/index.js';

/**
 * The seed is the library's promise: regenerate the question bank and the
 * options must land in exactly the same place, or everything keyed to a
 * question (a review schedule, a record of a wrong answer, a cached render)
 * comes unstuck. These tests pin the arithmetic, not just the shape, so an
 * "equivalent" rewrite of the hash or the PRNG cannot slip through green.
 */

describe('hashString', () => {
  it('returns the FNV-1a offset basis for the empty string, so seeds never collapse to zero', () => {
    expect(hashString('')).toBe(2166136261);
  });

  it('produces the same literal digests it produced yesterday, catching a swapped hash algorithm', () => {
    // Pinned deliberately. Any change here silently re-rolls every published
    // question bank, which is the one thing this module exists to prevent.
    expect(hashString('a')).toBe(3826002220);
    expect(hashString('genesis')).toBe(2525400345);
  });

  it('stays inside uint32 even for long inputs, so mulberry32 gets a well-formed seed', () => {
    const h = hashString('a very long seed string '.repeat(40));
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it('separates seeds that differ only in their last character', () => {
    expect(hashString('john:3:16')).not.toBe(hashString('john:3:17'));
  });
});

describe('mulberry32', () => {
  it('emits the same first three floats for seed 1, catching a rewritten PRNG', () => {
    const rand = mulberry32(1);
    expect(rand()).toBe(0.6270739405881613);
    expect(rand()).toBe(0.002735721180215478);
    expect(rand()).toBe(0.5274470399599522);
  });

  it('stays in [0, 1) so Math.floor(rand() * n) can never index off the end of a pool', () => {
    const rand = mulberry32(hashString('range check'));
    for (let i = 0; i < 5000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('gives two generators built from the same seed identical streams', () => {
    const a = mulberry32(99);
    const b = mulberry32(99);
    expect([a(), a(), a(), a()]).toEqual([b(), b(), b(), b()]);
  });

  it('diverges immediately for adjacent seeds, so neighbouring questions do not rhyme', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('seededShuffle', () => {
  const deck = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('returns the identical order every time for one seed', () => {
    expect(seededShuffle(deck, 'psalm-23')).toEqual(seededShuffle(deck, 'psalm-23'));
  });

  it('returns a different order for a different seed', () => {
    expect(seededShuffle(deck, 'psalm-23')).not.toEqual(seededShuffle(deck, 'psalm-24'));
  });

  it('is a permutation: nothing lost, duplicated or invented', () => {
    // Duplicates included on purpose, a shuffle that quietly deduped would
    // cost the card a choice, which is the same failure as a pool that cannot
    // fill it.
    const withDupes = ['a', 'a', 'b', 'b', 'b', 'c'];
    const shuffled = seededShuffle(withDupes, 'multiset');
    expect(shuffled).toHaveLength(withDupes.length);
    expect([...shuffled].sort()).toEqual([...withDupes].sort());
  });

  it('does not mutate the array it was handed', () => {
    const input = [...deck];
    seededShuffle(input, 'no-mutation');
    expect(input).toEqual(deck);
  });

  it('handles empty and single-element inputs without throwing', () => {
    expect(seededShuffle([], 'x')).toEqual([]);
    expect(seededShuffle(['only'], 'x')).toEqual(['only']);
  });

  it('actually reorders rather than returning the input untouched', () => {
    const ordered = Array.from({ length: 20 }, (_, i) => String(i));
    expect(seededShuffle(ordered, 'reorder')).not.toEqual(ordered);
  });
});

describe('pickDistractors', () => {
  const pool = ['Mark', 'Luke', 'John', 'Acts', 'Romans', 'James'];

  it('never hands back the answer as a wrong option', () => {
    for (let i = 0; i < 50; i++) {
      const picked = pickDistractors(pool, 'Luke', 5, `seed-${i}`);
      expect(picked).not.toContain('Luke');
    }
  });

  it('collapses duplicates, so the card never shows the same wrong option twice', () => {
    // Two rings overlapping is the normal case, not the exotic one; a repeated
    // string reads as a bug to whoever is answering and costs a real choice.
    const overlapping = ['Mark', 'Mark', 'Luke', 'Luke', 'John', 'John'];
    const picked = pickDistractors(overlapping, 'Acts', 6, 'overlap');
    expect(new Set(picked).size).toBe(picked.length);
    expect([...picked].sort()).toEqual(['John', 'Luke', 'Mark']);
  });

  it('returns fewer than n when the pool is genuinely too small, instead of padding', () => {
    // Reporting the shortfall honestly is what lets buildOptions repair it.
    // Inventing filler would hide the fact that the rings are drawn too tight.
    const picked = pickDistractors(['Mark', 'Luke'], 'John', 5, 'thin');
    expect(picked).toHaveLength(2);
    expect([...picked].sort()).toEqual(['Luke', 'Mark']);
  });

  it('returns nothing when the pool holds only the answer', () => {
    expect(pickDistractors(['John', 'John'], 'John', 3, 'only-answer')).toEqual([]);
  });

  it('is a pure function of its seed: same inputs, byte-identical output', () => {
    const first = pickDistractors(pool, 'Luke', 3, 'stable');
    const second = pickDistractors(pool, 'Luke', 3, 'stable');
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('draws a different subset or order for a different seed', () => {
    expect(pickDistractors(pool, 'Luke', 3, 'seed-a')).not.toEqual(
      pickDistractors(pool, 'Luke', 3, 'seed-b'),
    );
  });

  it('does not mutate the pool it was given', () => {
    const input = [...pool];
    pickDistractors(input, 'Luke', 3, 'no-mutation');
    expect(input).toEqual(pool);
  });

  it('returns an empty list for n = 0 rather than a single option', () => {
    expect(pickDistractors(pool, 'Luke', 0, 'zero')).toEqual([]);
  });
});
