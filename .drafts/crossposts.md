# Cross-post drafts

**What's safe to post:** `quiz-difficulty` and `fable-lenses`. Both are yours,
MIT, no scripture text, no third-party code.

**What is NOT safe to post:** `scripture-mastery`. It has no LICENSE file and the
copyright is Godwin's. He approved you forking and deploying for yourself, not
publishing it to an audience. Ask him for a LICENSE and it changes.

---

## Reddit — r/programming

**Title:** Your quiz app's "hard mode" is probably easier than its medium mode

Not a joke, and it's a fun little failure.

Say you build a difficulty setting for multiple-choice questions. Hard mode
draws its wrong answers from as close to the correct one as possible, because a
distractor only works if it's plausible — offering "Colossians" against a
question about Leviticus isn't hard, it's just a different subject, and it
eliminates itself.

Good instinct. Now tighten it far enough that one day the tight pool only has
three candidates and your hard tier wanted five.

Hard now renders four choices. Medium renders six.

Nothing throws. Nothing logs. Your hardest setting is now the easiest one on
screen, and the only symptom is people scoring *better* on hard.

I hit this twice in one codebase, in different question families, which is what
convinced me it wasn't a one-off. The fix is to declare your tiers in order and
make "no tier offers fewer options than an easier one" an actual invariant, with
tiers borrowing from wider pools rather than shipping a short card.

Second thing I got wrong on the first pass: when the tight pool runs short, don't
*replace* it with a wider one. Take all of it and top up. Replacing throws away
exactly the candidates that made the question hard, and does it precisely when
good candidates are scarcest. My own README example caught that one — I ran it
instead of trusting it and the output was visibly wrong.

Wrote it up as a small MIT library, no runtime deps:
https://github.com/kvadney-insomniac/quiz-difficulty

Mostly posting for the failure mode though. If you have a difficulty setting,
go check whether your hardest tier ever renders fewer choices than your middle
one. It's a two-minute check.

---

## Reddit — r/Anki (or r/languagelearning)

**Title:** If you generate your own cards, check that "hard" isn't secretly easier

For anyone building their own card generators rather than writing cards by hand.

Common setup: wrong answers get pulled from a pool, and harder settings pull
from a *tighter* pool — same chapter, same category, same era — because a
distractor from somewhere unrelated eliminates itself and turns a 4-choice
question into a 3-choice one.

The trap: tighten it enough and sometimes the tight pool doesn't have enough
candidates. Then your hard card renders three options where medium renders four,
and it's *easier* despite being labelled harder. Silent. The only sign is your
retention stats on hard looking suspiciously good.

Related thing I found in the same codebase that might matter more to this sub:
my mastery percentage was **falling as the exam got closer**, on cards I was
answering perfectly every time. Cause: part of the score was "how long an
interval has this survived", but intervals get clamped as the deadline
approaches (so nothing gets scheduled past the test). The clamp fought the
score and won. A perfect card read 100% at 30 days out and 79% at three.

If you've got any deadline-aware interval clamping in your setup, worth checking
whether your stats do the same thing. Demoralising exactly when you least need
it.

---

## Reddit — r/typescript

**Title:** Small MIT library: deterministic multiple-choice distractors that can't invert difficulty

`quiz-difficulty` — you describe candidate answers as *rings* around the correct
one (tightest first), declare tiers easiest-first, and it guarantees no tier ever
offers fewer options than an easier one.

Two things it's strict about:

**Determinism.** Every pick is a pure function of a seed you supply. Question
banks get regenerated, and if wrong answers move each time then anything keyed
to a question comes unstuck — a spaced-repetition schedule, a record of what
someone missed, a cached render.

**No inversion.** If a tight pool can't fill a card, the tier borrows rather
than rendering fewer choices, because a 3-choice "hard" question is easier than
a 6-choice "medium" one.

Zero runtime deps, full types, 90 tests. There's also a `seedForRing` escape
hatch so an existing question bank can adopt it without reshuffling every wrong
answer it has ever shown — I needed that myself and it kept the migration
byte-identical across 6,282 questions.

https://github.com/kvadney-insomniac/quiz-difficulty

---

## Hacker News — Show HN

**Title:** Show HN: Deterministic distractor generation that can't make hard mode easier

**Body:**

I was fixing a difficulty setting that wasn't doing much, and hit the same bug
twice in different parts of the codebase: tighten the pool your hardest tier
draws wrong answers from, and eventually it can't fill the card, so it renders
fewer choices than the middle tier. Your hardest setting becomes the easiest one
on screen and nothing tells you.

quiz-difficulty makes that a checked invariant: tiers are declared easiest-first
and none may end up offering fewer options than an easier one.

The other thing I got wrong, and only caught by running my own README example
instead of trusting it: when a tight pool comes up short, topping it up beats
replacing it. Replacing discards the candidates that made the question hard,
exactly when they're scarcest.

MIT, no runtime deps: https://github.com/kvadney-insomniac/quiz-difficulty

Also open-sourced the analysis toolkit that pointed me at the file in the first
place — churn × complexity scoring to decide where to aim an expensive model
rather than letting it roam: https://github.com/kvadney-insomniac/fable-lenses

---

## LinkedIn

(Use Option A or C from linkedin.md — they're longer-form and already tuned.
Don't post the same text to LinkedIn and Reddit; the registers are different and
people notice.)

---

## Before posting to Reddit — read this

Reddit is hostile to self-promotion in a way LinkedIn isn't, and the risk lands
on your account, not the post:

- **r/programming** removes repo links from accounts with no comment history in
  the sub. Several other programming subs auto-remove first-time link posts.
- The **9:1 rule** is still enforced culturally: roughly nine ordinary
  contributions for every one of your own things.
- Posting the *same* text to multiple subs in a short window is the single most
  reliable way to get flagged as spam and shadowbanned. Space them out by days,
  and rewrite rather than paste.
- Each of these leads with the **finding**, not the repo, and the link sits at
  the bottom. That's deliberate — it's what survives moderation and what people
  actually upvote.

If your Reddit account is new or has little history, I'd genuinely start with
**one** post — r/typescript is the most tolerant of the three — see how it lands,
and go from there. Hacker News has no such culture problem; Show HN is designed
for exactly this and is the safest single place to start.
