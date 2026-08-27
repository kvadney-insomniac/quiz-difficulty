/**
 * Tiers, and the guarantee that they stay in order.
 *
 * A difficulty setting is usually written as one knob over one pool. That is
 * where the bug lives: tighten the pool for the hardest setting, discover it
 * cannot fill the card, render four choices instead of six, and the hardest
 * setting is now the easiest one on screen. Nothing throws. The setting simply
 * means the opposite of its label.
 *
 * So tiers are declared as an ordered list, easiest first, and `buildOptions`
 * will not return a set that breaks that order.
 */
import { pickAcrossRings, type Ring, type RingSeed } from './pools.js';
import { pickDistractors, seededShuffle } from './rng.js';

export interface Tier {
  /** Key this tier's options come back under. */
  name: string;
  /** How many wrong options this tier renders alongside the answer. */
  wrongOptions: number;
  /**
   * Candidate pools, tightest first. The tier takes everything it can from the
   * first ring, then tops up from the next, and so on -- so widening adds to
   * the close candidates rather than replacing them.
   */
  rings: readonly Ring[];
}

export interface BuildOptions {
  /** The correct answer. Never appears among the distractors. */
  answer: string;
  /**
   * Stable identity for this question. Same seed, same options, forever --
   * see `./rng` for why that matters more than it sounds.
   */
  seed: string;
  /** Tiers, **easiest first**. The order is the contract. */
  tiers: readonly Tier[];
  /**
   * Override how each ring's shuffle seed is derived, when adopting this into a
   * bank whose options are already baked into content people have studied. See
   * `RingSeed` in ./pools. Leave unset for new banks.
   */
  seedForRing?: RingSeed;
}

export interface OptionSets {
  /** Wrong options per tier name. */
  distractors: Record<string, string[]>;
  /**
   * Tiers that ran out of candidates in their own chain and had to borrow from
   * another tier's to keep the ordering guarantee.
   *
   * Note the boundary: widening *within* a chain is ordinary business and is
   * not reported here -- a hard tier reaching past its tightest ring is the
   * chain working as designed. This names only the tiers whose entire chain
   * came up short.
   *
   * Not an error -- borrowing is the correct repair, and the alternative is a
   * tier that lies about its own difficulty. But it does mean the subject
   * matter is thinner around that answer than the tier assumed, which is worth
   * knowing when you are tuning rings.
   */
  borrowed: string[];
}

/**
 * Build every tier's wrong options for one question.
 *
 * Each tier draws from its own rings, widening only when the tight ring cannot
 * fill it. Then the order is enforced: no tier may end up offering fewer
 * options than a tier declared easier than it, because that is the inversion
 * this library exists to prevent. A tier that falls short borrows from the
 * pooled candidates of every tier rather than shipping a short card.
 */
export function buildOptions({ answer, seed, tiers, seedForRing }: BuildOptions): OptionSets {
  const distractors: Record<string, string[]> = {};
  const borrowed: string[] = [];
  const everything: string[] = [];

  for (const tier of tiers) {
    // A distinct seed per tier. Without it, a wider pool shuffled by the same
    // seed lands on nearly the same handful of strings, and the tiers become
    // several names for one question.
    distractors[tier.name] = pickAcrossRings(
      tier.rings,
      answer,
      tier.wrongOptions,
      `${seed}:${tier.name}`,
      seedForRing,
    );
    for (const ring of tier.rings) everything.push(...ring());
  }

  // Filtered and deduplicated before anything measures it.
  //
  // Both matter, and both were bugs. The raw accumulation carries whatever the
  // rings hand over, including empty strings -- and the borrow path filters
  // only the answer, so a blank would render as a wrong option. And its
  // *length* is used below to decide what a tier can be asked for, so counting
  // the same candidate once per ring that contains it overstates the supply and
  // flags tiers as having borrowed when nothing was added.
  const supply = [...new Set(everything)].filter((s) => s && s !== answer);

  // Enforce the order. Walking easiest to hardest, each tier must offer at
  // least as many options as the one before it.
  let floor = 0;
  for (const tier of tiers) {
    const current = distractors[tier.name] as string[];
    const want = Math.max(floor, Math.min(tier.wrongOptions, supply.length));
    if (current.length < want) {
      const topUp = pickDistractors(supply, answer, want, `${seed}:${tier.name}:borrow`);
      distractors[tier.name] = [...new Set([...current, ...topUp])].slice(0, want);
      borrowed.push(tier.name);
    }
    floor = Math.max(floor, (distractors[tier.name] as string[]).length);
  }

  return { distractors, borrowed };
}

/**
 * The full option list for one tier, answer included, in a stable shuffled
 * order -- so the answer is not always in the same slot, but is in the same
 * slot every time this question is asked.
 */
export function optionsFor(
  sets: OptionSets,
  tier: string,
  answer: string,
  seed: string,
): string[] {
  const wrong = sets.distractors[tier] ?? [];
  // `seededShuffle`, not `pickDistractors`: the latter exists to *exclude* a
  // correct answer, and here the answer is the one entry that must survive.
  return seededShuffle([answer, ...wrong], `${seed}:${tier}:order`);
}
