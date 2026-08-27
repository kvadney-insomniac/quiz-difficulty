/**
 * Rings: candidate pools ordered from tightest to widest.
 *
 * The idea the whole library rests on is that a wrong option is only doing work
 * if it is *plausible*. "Which book is Leviticus 10 in?" offered against
 * Colossians is not a hard question, it is a different subject -- the wrong
 * option eliminates itself and the question collapses to a guess among whatever
 * is left. Difficulty, then, is mostly a question of how close to the answer
 * you are willing to draw from.
 *
 * So you describe the candidates as rings around the answer and let the tier
 * decide which ring to start at. A hard tier starts tight; an easy tier starts
 * wide, where the wrong options are wrong on sight.
 */
import { seededShuffle } from './rng.js';

/** A ring: something that produces candidate strings when asked. */
export type Ring = () => readonly string[];


/**
 * How a ring's shuffle seed is derived from the question's seed.
 *
 * Overridable for one reason, and it is a good one: adopting this library into
 * an existing question bank. If your options are already baked into content
 * people have studied, changing how they are derived reshuffles every wrong
 * answer you have ever shown -- which is not a bug, but it is a migration, and
 * it is one nobody asked for. Supplying the derivation your bank already used
 * makes adoption byte-identical, and you can move to the default later on your
 * own schedule.
 */
export type RingSeed = (seed: string, ringIndex: number) => string;

/** Derived per ring, so appending a ring cannot reshuffle the ones before it. */
export const defaultRingSeed: RingSeed = (seed, i) => `${seed}:ring${i}`;

/**
 * Take `n` options, drawing from the tightest ring first and widening only to
 * make up a shortfall.
 *
 * This is the heart of it, and the ordering is the whole point. When a tight
 * ring holds four candidates and the tier wants five, the answer is *those four
 * plus one from further out* -- not five drawn from somewhere wider. Replacing
 * the ring instead of topping it up throws away exactly the candidates that
 * made the question hard, and does it precisely in the cases where good
 * candidates are scarcest.
 *
 * The widening itself matters more than the tightness. A pool that cannot fill
 * the card does not make the question harder, it makes it *shorter*, and a
 * three-choice question is easier than a six-choice one. Tightness that
 * silently costs a choice has made the hard tier easier than the medium one.
 *
 * Each ring is shuffled under its own derived seed, so adding a ring to the end
 * of a chain cannot reshuffle the ones before it.
 */
export function pickAcrossRings(
  chain: readonly Ring[],
  answer: string,
  n: number,
  seed: string,
  seedForRing: RingSeed = defaultRingSeed,
): string[] {
  const chosen: string[] = [];
  const seen = new Set<string>([answer]);

  for (let i = 0; i < chain.length && chosen.length < n; i++) {
    const build = chain[i] as Ring;
    const pool = [...new Set(build())].filter((s) => s && !seen.has(s));
    for (const candidate of seededShuffle(pool, seedForRing(seed, i))) {
      if (chosen.length >= n) break;
      chosen.push(candidate);
      seen.add(candidate);
    }
  }

  return chosen;
}

/**
 * The first ring that can supply `n` distinct options other than `answer`,
 * widening through the chain until one can; the widest seen if none can.
 *
 * Exported as a primitive for callers who want a *pool* rather than a
 * selection -- to inspect it, or to sample it themselves. Note that it
 * *replaces* rather than accumulates, which is the right shape only when your
 * rings are nested (each a superset of the last), as `ringsWithin` builds them.
 * For hand-written rings that are not nested, `pickAcrossRings` is what you
 * want.
 */
export function layeredPool(chain: readonly Ring[], answer: string, n: number): string[] {
  let widest: string[] = [];
  for (const build of chain) {
    const pool = [...new Set(build())].filter((s) => s && s !== answer);
    if (pool.length > widest.length) widest = pool;
    if (pool.length >= n) return pool;
  }
  return widest;
}

/**
 * Build rings from a distance function -- the common case, spelled once.
 *
 * Give it the candidates, a way to measure how far each sits from the answer,
 * and the radii you want. You get a chain of rings, tightest first: everything
 * within the first radius, then the second, and so on, ending with everything.
 *
 * Distance is whatever the subject makes it. Canonical position in an ordered
 * corpus, taxonomic depth, edit distance, year, category nesting -- the library
 * does not care, which is the point.
 */
export function ringsWithin<T>(
  items: readonly T[],
  label: (item: T) => string,
  distance: (item: T) => number,
  radii: readonly number[],
): Ring[] {
  const rings: Ring[] = radii.map(
    (r) => () => items.filter((i) => distance(i) <= r).map(label),
  );
  // Always end with everything, so a chain can never run out of candidates
  // while candidates still exist.
  rings.push(() => items.map(label));
  return rings;
}

/**
 * The mirror of `ringsWithin`: rings that start *far away* and close inward.
 *
 * This is what an easy tier wants. Not merely a wider pool -- a pool drawn from
 * somewhere else entirely, so every wrong option is recognisably not the answer
 * without knowing the subject in detail.
 */
export function ringsBeyond<T>(
  items: readonly T[],
  label: (item: T) => string,
  distance: (item: T) => number,
  radii: readonly number[],
): Ring[] {
  const rings: Ring[] = radii.map(
    (r) => () => items.filter((i) => distance(i) > r).map(label),
  );
  rings.push(() => items.map(label));
  return rings;
}
