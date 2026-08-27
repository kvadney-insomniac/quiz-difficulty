/**
 * Adopting this library into a bank that already has options baked in.
 *
 * This is the case that decides whether anyone can actually use it. A question
 * bank in service has wrong answers people have already seen and studied
 * against; changing how those are derived reshuffles every one of them. Not a
 * bug -- but a migration nobody asked for, and one that lands on learners as
 * "the answers moved" rather than as a release note.
 *
 * So the ring seed derivation is overridable, and this pins that it can
 * reproduce a prior scheme exactly rather than merely closely.
 */
import { describe, expect, it } from 'vitest';
import { buildOptions, pickDistractors, pickAcrossRings, defaultRingSeed } from '../src/index.js';

const POOL = ['Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth'];
const FAR = ['Matthew', 'Romans', 'Revelation', 'Titus', 'Jude'];
const ANSWER = 'Genesis';
const SEED = 'next-genesis';

/**
 * A scheme where the default tier seeded from the bare question seed and the
 * others suffixed it -- the shape a hand-rolled implementation tends to grow.
 */
const legacy = (s: string, _ringIndex: number) =>
  s.endsWith(':medium') ? s.slice(0, -':medium'.length) : s;

describe('adopting an existing bank', () => {
  it('reproduces a prior seed scheme byte for byte', () => {
    // What the prior implementation produced: one pool, one seeded pick.
    const before = {
      medium: pickDistractors(POOL, ANSWER, 3, SEED),
      easy: pickDistractors(FAR, ANSWER, 3, `${SEED}:easy`),
    };

    const after = buildOptions({
      answer: ANSWER,
      seed: SEED,
      seedForRing: legacy,
      tiers: [
        { name: 'easy', wrongOptions: 3, rings: [() => FAR] },
        { name: 'medium', wrongOptions: 3, rings: [() => POOL] },
      ],
    });

    expect(after.distractors.medium).toEqual(before.medium);
    expect(after.distractors.easy).toEqual(before.easy);
  });

  it('changes the options when the derivation is left at its default', () => {
    // The other half of the same claim: the override is doing real work, and
    // adopting *without* it is the migration this exists to let you avoid.
    const legacySets = buildOptions({
      answer: ANSWER, seed: SEED, seedForRing: legacy,
      tiers: [{ name: 'medium', wrongOptions: 3, rings: [() => POOL] }],
    });
    const defaultSets = buildOptions({
      answer: ANSWER, seed: SEED,
      tiers: [{ name: 'medium', wrongOptions: 3, rings: [() => POOL] }],
    });

    expect(defaultSets.distractors.medium).not.toEqual(legacySets.distractors.medium);
  });

  it('still derives a distinct seed per ring by default', () => {
    // The default exists so that appending a ring cannot reshuffle earlier
    // ones. An override that ignored the ring index would give that up, so the
    // default must keep varying with it.
    expect(defaultRingSeed('s', 0)).not.toBe(defaultRingSeed('s', 1));
  });

  it('passes the override down to every ring in a chain', () => {
    const calls: number[] = [];
    pickAcrossRings(
      [() => ['a'], () => ['b'], () => ['c']],
      ANSWER,
      3,
      SEED,
      (s, i) => {
        calls.push(i);
        return `${s}:${i}`;
      },
    );
    expect(calls).toEqual([0, 1, 2]);
  });
});
