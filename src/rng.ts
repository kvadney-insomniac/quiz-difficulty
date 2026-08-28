/**
 * Deterministic selection.
 *
 * Every choice this library makes is a pure function of a seed you supply, and
 * that is load-bearing rather than tidy. Question banks are usually regenerated
 * whenever a data file changes and the build runs again. If the wrong options
 * moved each time, anything keyed to a question would come unstuck: a
 * spaced-repetition schedule, a record of what someone got wrong, a cached
 * render.
 *
 * Seed with something stable about the question, not with the clock.
 */

/** FNV-1a. Small, fast, and good enough to spread seed strings across the space. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: a small, well-distributed PRNG with a 32-bit state. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates, driven by the seed. Does not mutate the input. */
export function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  const rand = mulberry32(hashString(seed));
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * Take `n` options from `pool`, never the answer itself, deterministically.
 *
 * Duplicates are collapsed first: two rings often overlap, and the same string
 * appearing twice would render as two identical wrong options, which reads as
 * a bug to whoever is answering, and quietly makes the question easier by
 * costing it a distinct choice.
 */
export function pickDistractors(
  pool: readonly string[],
  answer: string,
  n: number,
  seed: string,
): string[] {
  const candidates = [...new Set(pool)].filter((p) => p !== answer);
  return seededShuffle(candidates, seed).slice(0, n);
}
