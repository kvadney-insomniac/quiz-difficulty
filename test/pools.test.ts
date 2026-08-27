import { describe, it, expect } from 'vitest';
import { pickAcrossRings, layeredPool, ringsWithin, ringsBeyond, type Ring } from '../src/index.js';

/**
 * Rings, and the two different jobs they do.
 *
 * `pickAcrossRings` makes a *selection*: tightest ring first, widening only to
 * make up a shortfall, so the close candidates survive. `layeredPool` returns a
 * *pool*: it replaces rather than accumulates, which is right only when the
 * rings are nested. The two are easy to confuse and the difference is exactly
 * where the interesting bug lives, so they are tested apart.
 */

const ring = (...items: string[]): Ring => () => items;

describe('pickAcrossRings', () => {
  const tight = ring('near-1', 'near-2', 'near-3');
  const wide = ring('far-1', 'far-2', 'far-3', 'far-4');

  it('takes everything the tight ring has before touching the next one', () => {
    // The whole point of accumulating. Four close candidates when the tier
    // wants five must mean "those four plus one from further out", never five
    // drawn from somewhere wider -- otherwise widening throws away precisely
    // the candidates that made the question hard.
    const picked = pickAcrossRings([tight, wide], 'answer', 5, 'accumulate');
    expect(picked).toHaveLength(5);
    expect(new Set(picked.slice(0, 3))).toEqual(new Set(tight()));
    for (const late of picked.slice(3)) expect(wide()).toContain(late);
  });

  it('stops at the tight ring when it can already fill the card', () => {
    const picked = pickAcrossRings([tight, wide], 'answer', 3, 'no-widening');
    expect(new Set(picked)).toEqual(new Set(tight()));
  });

  it('leaves earlier rings untouched when a ring is appended to the chain', () => {
    // Each ring is shuffled under its own derived seed. Without that, adding a
    // fallback ring would reshuffle the close candidates too, and every
    // published question in the bank would move.
    const short = pickAcrossRings([tight], 'answer', 5, 'append-stable');
    const long = pickAcrossRings([tight, wide], 'answer', 5, 'append-stable');
    expect(long.slice(0, short.length)).toEqual(short);
  });

  it('does not repeat a candidate that two overlapping rings both contain', () => {
    // Overlapping rings are the normal case, not the exotic one: a repeated
    // string costs the card a distinct choice and reads as a bug.
    const picked = pickAcrossRings(
      [ring('a', 'b'), ring('a', 'b', 'c', 'd')],
      'answer',
      4,
      'overlap',
    );
    expect(picked).toHaveLength(4);
    expect(new Set(picked).size).toBe(4);
    expect([...picked].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns fewer than n when the whole chain is too small, rather than padding', () => {
    // Honest shortfall is what lets buildOptions repair the ordering. Filler
    // would hide the fact that the rings are drawn too tight around this answer.
    expect(pickAcrossRings([ring('a', 'b')], 'answer', 5, 'thin')).toHaveLength(2);
  });

  it('never selects the answer, even when a ring lists it', () => {
    const picked = pickAcrossRings([ring('a', 'answer', 'b')], 'answer', 3, 'self');
    expect(picked).not.toContain('answer');
    expect([...picked].sort()).toEqual(['a', 'b']);
  });

  it('drops empty strings, which would render as a blank choice', () => {
    const picked = pickAcrossRings([ring('a', '', 'b', '')], 'answer', 4, 'blank');
    expect(picked).not.toContain('');
    expect([...picked].sort()).toEqual(['a', 'b']);
  });

  it('is a pure function of its seed', () => {
    const first = pickAcrossRings([tight, wide], 'answer', 5, 'pure');
    const second = pickAcrossRings([tight, wide], 'answer', 5, 'pure');
    expect(first).toEqual(second);
  });

  it('orders the same candidates differently under a different seed', () => {
    expect(pickAcrossRings([wide], 'answer', 4, 'seed-a')).not.toEqual(
      pickAcrossRings([wide], 'answer', 4, 'seed-b'),
    );
  });

  it('returns nothing for n = 0 and nothing for an empty chain', () => {
    expect(pickAcrossRings([tight], 'answer', 0, 'zero')).toEqual([]);
    expect(pickAcrossRings([], 'answer', 5, 'empty-chain')).toEqual([]);
  });
});

describe('layeredPool', () => {
  it('returns the first ring that can supply n, without consulting wider ones', () => {
    const chain = [ring('a', 'b'), ring('a', 'b', 'c', 'd'), ring('a', 'b', 'c', 'd', 'e', 'f')];
    expect(layeredPool(chain, 'answer', 3)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('widens past a ring that is too small instead of shipping a short card', () => {
    const chain = [ring('a'), ring('a', 'b', 'c')];
    expect(layeredPool(chain, 'answer', 3)).toEqual(['a', 'b', 'c']);
  });

  it('returns the widest ring it saw, not the last one it tried, when none can supply n', () => {
    // Deliberate and easy to regress: "as many as we could find" beats
    // "whatever the final attempt happened to hold". The chain below is built
    // so those two answers differ -- the widest ring is in the middle.
    const chain = [ring('a', 'b'), ring('a', 'b', 'c', 'd'), ring('x', 'y', 'z')];
    expect(layeredPool(chain, 'answer', 5)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('excludes the answer, and does so before judging whether a ring is big enough', () => {
    // A ring of three where one is the answer supplies two, not three. Counting
    // the answer would let a ring win that cannot actually fill the card.
    const chain = [ring('a', 'answer', 'b'), ring('a', 'b', 'c')];
    expect(layeredPool(chain, 'answer', 3)).toEqual(['a', 'b', 'c']);
  });

  it('excludes empty strings, which would otherwise render as a blank choice', () => {
    expect(layeredPool([ring('a', '', 'b')], 'answer', 2)).toEqual(['a', 'b']);
  });

  it('collapses duplicates within a ring before counting it', () => {
    const chain = [ring('a', 'a', 'b', 'b'), ring('a', 'b', 'c')];
    expect(layeredPool(chain, 'answer', 3)).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty pool for an empty chain rather than throwing', () => {
    expect(layeredPool([], 'answer', 3)).toEqual([]);
  });
});

/** A tiny ordered corpus: distance is position, the way a canonical order works. */
interface Book {
  name: string;
  index: number;
}
const corpus: Book[] = [
  { name: 'Matthew', index: 0 },
  { name: 'Mark', index: 1 },
  { name: 'Luke', index: 2 },
  { name: 'John', index: 3 },
  { name: 'Acts', index: 5 },
  { name: 'Romans', index: 8 },
  { name: 'Revelation', index: 20 },
];
const name = (b: Book) => b.name;
const distanceFromLuke = (b: Book) => Math.abs(b.index - 2);

describe('ringsWithin', () => {
  const chain = ringsWithin(corpus, name, distanceFromLuke, [1, 3, 6]);

  it('starts tight and widens, each ring containing the one before it', () => {
    const sizes = chain.map((r) => r().length);
    for (let i = 1; i < chain.length; i++) {
      const inner = new Set(chain[i - 1]!());
      for (const item of inner) expect(chain[i]!()).toContain(item);
      expect(sizes[i]!).toBeGreaterThanOrEqual(sizes[i - 1]!);
    }
  });

  it('draws the tightest ring at the requested radius, not somewhere near it', () => {
    expect([...chain[0]!()].sort()).toEqual(['John', 'Luke', 'Mark']);
  });

  it('always ends with a ring holding everything, so a chain cannot run dry', () => {
    // The guarantee that makes widening safe: as long as candidates exist
    // anywhere, the last ring has them.
    expect([...chain[chain.length - 1]!()].sort()).toEqual([...corpus.map(name)].sort());
    expect(chain).toHaveLength(4);
  });

  it('still appends the everything-ring when no radii are given at all', () => {
    const bare = ringsWithin(corpus, name, distanceFromLuke, []);
    expect(bare).toHaveLength(1);
    expect(bare[0]!()).toHaveLength(corpus.length);
  });

  it('yields an empty tight ring rather than throwing when nothing is that close', () => {
    const impossible = ringsWithin(corpus, name, distanceFromLuke, [-1]);
    expect(impossible[0]!()).toEqual([]);
    expect(impossible[1]!()).toHaveLength(corpus.length);
  });
});

describe('ringsBeyond', () => {
  // Radii descend, because "beyond 6" is the far ring and "beyond 1" is nearer:
  // the chain starts somewhere else entirely and closes inward.
  const chain = ringsBeyond(corpus, name, distanceFromLuke, [6, 3, 1]);

  it('starts far away and closes inward, each ring containing the one before it', () => {
    for (let i = 1; i < chain.length; i++) {
      for (const item of chain[i - 1]!()) expect(chain[i]!()).toContain(item);
    }
  });

  it('opens on candidates that are wrong on sight, not on the answer neighbours', () => {
    // What an easy tier wants: not merely a wider pool, but one drawn from
    // somewhere the answer plainly is not.
    expect([...chain[0]!()].sort()).toEqual(['Revelation']);
    expect(chain[0]!()).not.toContain('Mark');
  });

  it('always ends with a ring holding everything, so a chain cannot run dry', () => {
    expect([...chain[chain.length - 1]!()].sort()).toEqual([...corpus.map(name)].sort());
    expect(chain).toHaveLength(4);
  });

  it('is the mirror of ringsWithin: their rings at the same radius are complements', () => {
    const within = ringsWithin(corpus, name, distanceFromLuke, [3])[0]!();
    const beyond = ringsBeyond(corpus, name, distanceFromLuke, [3])[0]!();
    expect([...within, ...beyond].sort()).toEqual([...corpus.map(name)].sort());
    expect(within.some((n) => beyond.includes(n))).toBe(false);
  });

  it('yields an empty far ring rather than throwing when nothing is that distant', () => {
    const impossible = ringsBeyond(corpus, name, distanceFromLuke, [999]);
    expect(impossible[0]!()).toEqual([]);
    expect(impossible[1]!()).toHaveLength(corpus.length);
  });
});
