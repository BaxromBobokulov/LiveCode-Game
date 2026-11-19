# 0003. Syntax Rush word obstacles: rationale

Decision history for [index.md](index.md). Not needed to build; read it to understand why.

## Context

Syntax Rush (spec 0002) is built and mostly verified: bugs carry one character, you type it, the nearest match bursts. The user wants a second kind of obstacle that carries a whole programming keyword, typed letter by letter, while single characters stay. Already decided and not reopened here: the words come from a short list we write ourselves (no song lyrics or other copyrighted text), and words are added next to the single character tiers, not instead of them. The user also wants obstacles to spawn closer together, and words to move slower than single characters.

The forces at play:
- **Typing a word takes much longer than one key.** A beginner types roughly 2 to 3 letters a second. An 8 letter word at the single character speed would be unbeatable, so words need their own pace, and the 0002 fairness guarantee (at least 1.0 s fully visible at top speed) is not enough on its own for a word.
- **Keys become ambiguous.** With one character per bug, a key either matches a bug or not. With words, the letter `e` could be the next letter of a half typed word, the first letter of another word, or a single `e` bug. The rule that picks one must be predictable for a beginner and simple enough to unit test.
- **The "don't frustrate beginners" pattern of 0002.** A wrong key costs no life, only the combo. Whatever we do with a typo mid word should feel the same.
- **AGENTS.md rules.** Pure engine functions with plain objects, one engine file per mechanic, no new dependency, Classic Runner untouched (0002 AC-3).
- **0002 is shipped and its `verify.md` is being checked off right now.** Rewriting its acceptance criteria in place would change what that checklist verifies.

## Options considered

### Option 1: Word first, one active word, progress kept on a wrong key (chosen)

The first correct letter of a word makes it the active word. The next key goes to the active word first; if it does not fit, it can still destroy a matching single anywhere, or start a word that is nearer than the active one (which drops the old one's progress); otherwise it is a wrong key, which only breaks the combo.

**Pros**:
- Predictable: there is one word "in your hands" at a time, shown by the lock.
- You can always save yourself: a fast single or a closer word about to hit is still typeable mid word.
- A typo never erases progress, matching 0002's kindness rule.
- One pure function (`typeChar`) with a three step order, easy to test.

**Cons**:
- A typo that happens to be the first letter of a nearer visible word switches words and drops progress.
- The word gets priority over a single with the same letter, so a player sometimes has to press a letter twice.

### Option 2: Strict lock (classic typing game style)

Once you start a word, every key goes to it until it is finished or reaches you. Anything else is a wrong key.

**Pros**:
- The simplest rule to explain and to build.
- No accidental switching.

**Cons**:
- You cannot react to a fast single or a closer word while locked, so you lose lives you could see coming. Bad for beginners, and it makes the fast single "burst" bugs unfair.
- Needs an escape key (Backspace) to be bearable, which adds a new key class to 0002's key rules.

### Option 3: No lock, every key goes to the nearest matching next letter

Every obstacle tracks its own progress; a key advances the nearest obstacle whose next letter matches. Several words can be half typed at once.

**Pros**:
- No priority rule at all, just "nearest".

**Cons**:
- Typing `l` with `let` and `loop` both on screen advances the nearer one, then `o` might advance a third word. Progress scatters across words and the player cannot tell what they are typing.
- Displaying several half typed words clearly is much harder.

### Where the spec lives

A new spec 0003 that amends 0002, instead of editing 0002 in place. 0002 is shipped and its verify checklist is in progress; changing its ACs under that checklist would make it unclear what was verified against what. 0003 names exactly which parts of 0002 it replaces. The runner up (editing 0002 in place) would keep everything in one file, at the cost of a mixed record.

## Rationale

Option 1 is chosen because it is the only one that is both predictable and forgiving. The strict lock reads well on paper but turns the new fast single characters into unavoidable hits while you finish a long word, which is exactly the frustration 0002 worked to avoid. The free model has no frustration from locking but makes the screen unreadable once two words share letters. Option 1 keeps a single active word (clear display, one caret) and still lets every key do something useful. Its one sharp edge, switching by accident, is softened by the spawn rule that keeps first letters of on screen words apart, and its cost is retyping a few letters, never a life.

On the open questions:

- **A, display.** Typed letters fade (opacity, not strike through, which hurts small monospace text), the next letter is gold with a caret bar, the rest are ink. The lock follows the active word when there is one, because the lock answers "where does my next key go"; otherwise it stays the 0002 nearest target. Letters sit in fixed cells so the engine can compute the tile width without measuring text, which keeps visibility and the fairness guarantee pure and testable.
- **B, wrong key.** Count it as a miss (combo reset, flash) and keep progress. Resetting the word would punish one slip with several keys of rework, and it would make long words the least fun part of the mode.
- **C, tiers.** Short words (2 to 5 letters) from the start, so the new mechanic shows up in every run, even short ones; long words join with tier 2 at score 200, alongside the harder symbols. 18 words in total, letters only, so every keyboard layout that already works for letters works for words. Word chance 0.2 then 0.3: about one bug in five, then one in three.
- **D, speed.** Singles keep their 0002 curve (top about 1.1 s visible), which already makes them the fast "burst" type by comparison; pushing them faster would cut into the 1.0 s guarantee for little gain. Words run at half the single speed, capped per length so each gets 1.0 s plus 0.4 s per letter at top speed (an 8 letter word gets 4.2 s, about 25 WPM pace including the reaction second). A length based cap is a stronger promise than one flat factor, which would give long words far too little time. "Closer together" is done by shortening the base gap (0.7 to 1.3 s), while each word adds 0.3 s per letter to the following gap so a long word does not arrive in a crowd.
- **E, scoring.** 10 points per letter of a finished obstacle. It keeps singles at exactly today's 10, rewards the longer effort fairly, and needs one rule instead of two. Partial words score nothing, so there is no reason to start words just to farm points.
- **F, WPM.** No formula change. WPM already counts correct keys divided by 5 (the standard "5 characters = 1 word"), so typed words fit it naturally and the number will read a bit higher and more realistic. Mid word correct letters count as correct keys; the combo still counts obstacles, not letters, so it stays a "streak of kills" readout.

The runner up overall was Option 2 with Backspace as an escape. It would be simpler to build but asks beginners to learn an extra control under pressure.

## Amendment: lift overlapping tiles (2026-11-19)

The code review (`docs/reviews/2026-11-19-main.md`, on a second model) found that a fast single passing a slow locked word disappears under the word's tile. The locked tile is drawn on top and is taller (52.8 against 44 px), so it covers the single's tile completely, for about 0.5 to 1 s early in a run. The bug sprite stays visible and the single can still cost a life, so it was fair, but you could not read the character you needed to type. While checking the geometry, the reverse case turned up too: a locked single passing a word covers about 3 of the word's letters.

Decided with the engineer, one question each:
- **Which tiles lift:** any visible tile that overlaps the locked tile, whichever is locked. Chosen over "only when the locked tile is a word" (the reviewer's version, which leaves the reverse case) and "every overlap between any two tiles" (it can stack 3 rows, and unlocked overlaps are already readable because later singles draw on top).
- **How far:** just clear the locked tile (its height plus a 4 * SCALE gap). Chosen over a fixed row height, which leaves more gap than needed.
- **Motion:** snap, worked out fresh each frame. Chosen over a 0.1 s slide, which needs per bug state in the loop for a jump that lasts under a second.
- **Making hidden bugs harmless** was rejected outright (the reviewer agreed): the bug sprite is a visible threat, and a harmless bug would teach the wrong thing.

Decided by the architect: the overlap test lives in `SyntaxRushCanvas.tsx`, not the engine. It is drawing layout, it needs the tile sizes that only the canvas knows (`SYMBOL_TILE_SIZE`), and it changes no game rule, so the "one engine file explains the mechanic" rule is untouched. The cost is no unit test for it; the manual verify steps cover it.

## Amendment: difficulty retune (2026-11-19, commit a07971b)

After this spec shipped, students died too fast: almost none reached a score of 1000. Two causes worked together. The 0002 speed curve had been pushed up (ramp 8, top 420), and this spec tightened the gaps to 0.7 to 1.3 s while words were only 20 to 30 percent of spawns, so most of the load was fast single characters.

The retune changes both sides. Speed: ramp 5 and top 360 (see 0002 rationale.md, I), which still doubles the speed within 30 s. Gaps: 0.9 to 1.6 s. Mix: words rise to 35 percent below score 200 and 45 percent from 200. Words walk at half speed and pay 10 points per letter, so more words give longer reaction windows and faster score growth together. The single character floor (1.0 s, now about 1.28 s) and the per word visible time floor are unchanged; for 4 letters and up the word cap still binds, so only `if` style 2 and 3 letter words gain time from the lower top speed.

These values are a tuning guess from the death reports, not yet confirmed by playtest. Runner up: keep the gaps and only cut speed, which helps less early in the run, where the gaps matter most.

## Cross check (2026-11-19)

The engineer accepted A to F as written, then asked for a review on a second model (Sonnet) before finalizing. It confirmed the numbers table against the real constants and found these, all fixed in `index.md`:

- **Switching only to a nearer word (AC-8 step 2).** The first draft let any matching word take over, including one farther away than the active word, which drops progress for no gain. Now, while a word is active, only nearer words can take over; singles can still be destroyed anywhere. This matches the reason switching exists (saving yourself from the bug that reaches you first) and makes accidental switches rarer. It is the one change in behavior; everything else is wording or missing detail.
- **`lastSymbol` remembers singles only.** Recording words in it would let `k`, `if`, `k` through and break the "never the same single twice in a row" rule from 0002.
- **Score test number.** `syntaxScore(10, 8)` is 180, not 130 (10 s of distance is 100 points).
- **Details a builder would otherwise invent:** the tie break on equal `x` (list order, as `findTarget`), "nearest" measured by bug `x`, why the active word needs no visibility check, `typeChar` never mutating its input and keeping list order, the word tile font, size, anchor and caret geometry, typed letters as faded ink, tiles drawn after the mascot so a word is never hidden behind it, the key path using `burstAt` rather than `removeObstacle`, the first spawn gap unchanged, and the exact test file edits allowed by AC-18.
- **Tests added:** no switch to a farther word, tie break, pure result, a sequence invariant over 50 keys, and manual steps for AC-10, AC-11, AC-12, AC-16, AC-17.
