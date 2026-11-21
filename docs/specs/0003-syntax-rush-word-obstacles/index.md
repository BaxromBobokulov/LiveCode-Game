# 0003. Syntax Rush word obstacles

**Date**: 2026-11-18
**Status**: Accepted (amended 2026-11-19: overlapping tiles lift, AC-10; built)
**Amended**: 2026-11-19, difficulty retune in commit a07971b (AC-2, AC-4, AC-5, the constants list, the resulting numbers, the picking and gap tests; reasoning in rationale.md)
**Amends**: [0002](../0002-syntax-rush-mode/index.md) (replaces 0002 AC-6 for words, the visibility edge of AC-8, the key resolution of AC-9, and the points rule of AC-17; changes two spawn gap constants of AC-7; everything else in 0002 still holds)

## Summary

Some Syntax Rush bugs now carry a whole programming keyword (like `if`, `while`, `return`, `function`) instead of one character. You type the word letter by letter: typed letters fade, the next letter is gold with a small caret (a bar under it), and the word bursts when you finish it. Words walk slower than single characters and get a guaranteed reading and typing window that grows with their length, so single characters now feel like the fast "burst" bugs. A wrong key keeps your progress on the word (it only breaks your combo, as today), a finished word scores 10 points per letter, and the WPM formula stays as it is.

## Requirements

**User stories**:
- As a student on a break, I want to type real keywords like `return` and `function`, so Syntax Rush feels closer to writing code and does not get stale.
- As a beginner, I want to see exactly which letter comes next in a word, so I never lose my place halfway through.
- As a beginner, I want a typo to cost me my combo, not the whole word, so a slip does not feel punishing.

**Acceptance criteria**:

Words and spawning
- **AC-1**: Some bugs carry a word instead of one character: a lowercase programming keyword of 2 to 8 letters, `a` to `z` only (no symbols, so non Latin layouts still work through the 0002 `event.code` fallback). The word shows in one wide tile above the bug. Single character obstacles keep their 0002 pools, tiers, and letter chance unchanged. The word lists:
  - Tier 1, from the start of a run (22 words, 2 to 6 letters): C `if`, `for`, `int`, `float`, `char`, `else`, `switch`, `while`, `void`; Python `def`, `elif`, `in`, `not`, `and`, `or`, `pass`, `print`, `len`, `range`, `input`; both `true`, `false`.
  - Tier 2, once the full score reaches `SYNTAX_TIER_2_SCORE` (200), adds 16 words: C `struct`, `printf`, `scanf`, `sizeof`, `include`; Python `lambda`, `import`, `global`, `return`, `continue`; general `array`, `class`, `break`, `string`, `boolean`, `function`.
  - The lists match what LiveCode students learn (C and Python), changed 2026-11-19 from the first JavaScript-style lists. All lowercase, so Python's `True` / `False` appear as `true` / `false`.
- **AC-2**: Each spawn first rolls word or single: a word with chance `WORD_CHANCE_TIER_1` (0.35) below score 200, `WORD_CHANCE_TIER_2` (0.45) from 200 (retuned 2026-11-19, first set at 0.2 and 0.3). Otherwise the single character is picked exactly as in 0002 AC-5 and AC-6 (never the same as the previous single, even with words spawned in between: `lastSymbol` remembers singles only).
- **AC-3**: A word is picked evenly from the tier's words, leaving out the last word spawned this run and any word whose first letter is the first letter of a word already on screen (fully visible or not). If that leaves no word, only the "not the last word" rule applies. Singles are not considered: a single `l` next to the word `len` is allowed (AC-8 then sends `l` to whichever is nearer).
- **AC-4**: The base gap is picked between `SYNTAX_SPAWN_INTERVAL_MIN` (0.9 s) and `SYNTAX_SPAWN_INTERVAL_MAX` (1.6 s) (retuned 2026-11-19; this spec first set 0.7 and 1.3). Right after a word spawns, the next gap also adds `WORD_SPAWN_GAP_PER_LETTER` (0.3 s) per letter of that word. The first spawn of a run still waits one base gap.

Speed and fairness
- **AC-5**: Single characters keep the 0002 speed curve and their guarantee unchanged: about 1.3 s fully visible at top speed (at least `SYNTAX_MIN_VISIBLE_TIME`, 1.0 s). A word moves at `min(syntaxSpeed(t) × WORD_SPEED_FACTOR, wordSpeedCap(letters))`, with `WORD_SPEED_FACTOR` = 0.5. The cap is set so a word is fully visible for at least `SYNTAX_MIN_VISIBLE_TIME + letters × WORD_LETTER_TIME` (`WORD_LETTER_TIME` = 0.4 s) before it reaches the mascot, at any speed. Each bug moves at its own speed; the ground, clouds, and particles keep moving at the single character speed. A unit test checks the guarantee for every word in both tiers at top speed.
- **AC-6**: A word counts as fully on screen when its whole tile is inside the view: `max(x + width, x + width / 2 + wordLabelWidth(letters) / 2) <= SYNTAX_VIEW_WIDTH` (`x` and `width` are the bug's box), where `wordLabelWidth(n) = n × WORD_CHAR_WIDTH + 2 × WORD_TILE_PADDING`. A single character keeps the 0002 rule (`x + width`). Only fully visible obstacles show a tile, can be typed, or can be locked.

Typing
- **AC-7**: Each obstacle has a next expected character: a single's own character, or the letter of a word at its progress (the number of letters already typed, `typed`). At most one word has progress above 0 at any time; that word is the active word.
- **AC-8**: A counted key (0002 AC-12) with at least one visible obstacle is resolved in this order:
  1. If there is an active word and the key matches its next letter, its progress goes up by one. When its last letter is typed, the word is destroyed.
  2. Otherwise, the nearest candidate whose next expected character matches. Candidates are every visible single, plus every visible untouched word, except that while a word is active only words nearer than it (`x < activeWord.x`) are candidates. A single is destroyed and the active word keeps its progress. A word becomes the active word with progress 1, and the old active word (if any) drops back to progress 0. So you can switch only to a word that will reach you sooner, never away to a farther one.
  3. Otherwise it is a wrong key.
  "Nearest" is the smallest bug `x` (every tile is centered on its bug, so this is also the tile order); on equal `x` the first in list order wins, as in `findTarget`. Step 1 needs no visibility check: a word only becomes active while visible and only moves left in a fixed view, so it stays visible until it is removed. Each letter matches with the 0002 rules (either case, non Latin letter fallback).
- **AC-9**: A wrong key while a word is active costs no life and keeps the word's progress. It resets the combo and shows the red edge flash with its rate limit, exactly as 0002 AC-11.
- **AC-10**: Lock and display. The locked tile is the active word if there is one, otherwise the nearest visible obstacle (the 0002 target). The locked tile is 1.2 times taller (`TARGET_TILE_SCALE`), wider by the same amount in px, has the accent outline, and is drawn on top of every other tile. All tiles are drawn after the mascot, so a word close to the mascot is never hidden behind its sprite. In a locked word, the typed letters are ink colored at 0.45 opacity, the next letter is gold with a gold caret bar under it, and the letters after it are ink colored at full opacity. Every tile that is not locked is muted, normal size, with no outline and no caret. A locked single looks as in 0002 (gold, larger, outlined). Letters are drawn one per fixed cell `WORD_CHAR_WIDTH` wide, so the drawn width always equals `wordLabelWidth`. Color is never the only cue (size, outline, caret, opacity). No tile is ever hidden behind the locked tile: any visible tile that overlaps the locked tile sideways (single or word, whichever is locked) is drawn lifted straight up by the locked tile's height plus `TILE_LIFT_GAP` (4 * SCALE), still centered over its own bug, and drops back the frame the overlap ends (it snaps, no animation). Lifting changes only where the tile is drawn: visibility, typing, locking, and collisions are unchanged.
- **AC-11**: A destroyed word disappears at once with the same accent burst as a single, at the bug's position.
- **AC-12**: A word that reaches the mascot works like any bug: it costs a life (or pops during grace) and its progress is gone with it. If it was the active word, no word is active afterwards.

Score, combo, stats
- **AC-13**: A destroyed obstacle adds `COIN_VALUE` (10) per character: a single still adds 10, `function` adds 80. Letters of a word that is never finished add nothing. The tier 2 threshold uses this score.
- **AC-14**: The combo goes up by one per destroyed obstacle (a word counts once, on its last letter). A correct letter in the middle of a word leaves the combo as it is. A wrong key and a lost life reset it, as in 0002.
- **AC-15**: Every key that advances a word or destroys a single counts as a correct key, including letters of a word that is later lost or dropped by a switch. Wrong keys count as in 0002. The WPM and accuracy formulas of 0002 AC-22 are unchanged.

Lifecycle and scope
- **AC-16**: Pause keeps every word's progress. Quit throws the run away. A new run starts with no active word and no last word.
- **AC-17**: The menu hint under the Syntax Rush button reads "Type the letter, symbol or word on each bug. Esc pauses."
- **AC-18**: Classic Runner is unchanged: 0002 AC-3 still holds in full. This change edits only `src/engine/syntaxRush.ts`, `src/engine/syntaxRush.test.ts`, `src/engine/types.ts` (one field and one type), the Syntax Rush block of `src/constants/game.ts`, `src/features/game/SyntaxRushCanvas.tsx`, and the hint line in `src/features/game/MainMenu.tsx`. In `syntaxRush.test.ts` only these existing parts change: the `bug()` helper gains `typed: 0`, the `resolveKey` tests are rewritten against `typeChar`, the `spawnSymbolObstacle` expectation gains `typed: 0`, and the `advanceSymbolObstacles` test follows its new signature. Every other existing test passes untouched.
- **AC-19**: Word picking, spawn gaps, label width and visibility, per obstacle speed, key resolution, and lock lookup are pure functions in `engine/syntaxRush.ts`, covered by Vitest with no canvas.

## Decision

**Chosen option**: Option 1: Word first typing with one active word, keeping progress on a wrong key

A word becomes active on its first correct letter and gets the next keys first; keys that do not fit it can still destroy singles or switch to a nearer word; a wrong key never erases progress. Words are a slower obstacle type inside the existing Syntax Rush engine, not a new mode or file.

## Feature design

**Data model sketch** (in memory only, no new storage):
- `SymbolObstacle` (`engine/types.ts`) gains `typed: number`, required: letters already typed. Always 0 for a single and for a word nobody has started. `symbol` can now be a word (2 to 8 lowercase letters); `symbol.length > 1` is what makes an obstacle a word. No separate `kind` field.
- `TypeResult` (new, `engine/types.ts`): `{ kind: 'miss' } | { kind: 'progress'; obstacles: SymbolObstacle[] } | { kind: 'destroyed'; obstacle: SymbolObstacle; obstacles: SymbolObstacle[] }`. `obstacles` is the new list (destroyed one removed, progress updated, any dropped word reset to 0).
- Loop state in `SyntaxRushCanvas.tsx`: `destroyed` becomes `destroyedLetters` (sum of `symbol.length` of destroyed obstacles); new `lastWord: string | null` (last word spawned). `lastSymbol` stays and keeps its 0002 meaning: the last single spawned, never a word. The active word is never stored separately: it is derived from `typed > 0`.
- Store, storage, best score: unchanged.

**Invariant**: at most one obstacle has `typed > 0`. `typeChar` is the only function that changes `typed`, and it keeps this true.

**Engine functions** (`engine/syntaxRush.ts`, all pure):

| Function | Inputs | Output | Notes |
|---|---|---|---|
| `isWord(symbol)` | string | boolean | `symbol.length > 1` |
| `wordPool(score)` | full score | `readonly string[]` | tier 1 words, plus tier 2 from `SYNTAX_TIER_2_SCORE` |
| `wordChance(score)` | full score | 0 to 1 | `WORD_CHANCE_TIER_1` below 200, else `WORD_CHANCE_TIER_2` |
| `pickWord(score, lastWord, onScreen, random)` | score, string or null, obstacles, random | string | pool minus `lastWord` minus words whose first letter starts any word in `onScreen`; if empty, pool minus `lastWord`; then one `random()` picks evenly |
| `pickSpawn(score, lastSymbol, lastWord, onScreen, random)` | | string | first `random() < wordChance(score)` → `pickWord`, else `pickSymbol(score, lastSymbol, random)` (0002, unchanged) |
| `spawnGapAfter(symbol, random)` | | seconds | `pickSyntaxSpawnInterval(random)` plus `WORD_SPAWN_GAP_PER_LETTER × symbol.length` for a word |
| `wordLabelWidth(letters)` | number | world px | `letters × WORD_CHAR_WIDTH + 2 × WORD_TILE_PADDING` |
| `rightEdge(obstacle)` | | world px | single: `x + width`; word: `max(x + width, x + width / 2 + wordLabelWidth / 2)` |
| `visibleObstacles(obstacles)` | | | changed: uses `rightEdge(o) <= SYNTAX_VIEW_WIDTH` |
| `wordVisibleDistance(letters)` | | world px | `SYNTAX_VIEW_WIDTH - max(BUG.width, BUG.width / 2 + wordLabelWidth / 2) - (MASCOT_X + MASCOT_SIZE)` |
| `wordSpeedCap(letters)` | | px/s | `wordVisibleDistance(letters) / (SYNTAX_MIN_VISIBLE_TIME + letters × WORD_LETTER_TIME)` |
| `obstacleSpeed(symbol, elapsedTime)` | | px/s | single: `syntaxSpeed(t)`; word: `min(syntaxSpeed(t) × WORD_SPEED_FACTOR, wordSpeedCap(length))` |
| `advanceSymbolObstacles(obstacles, elapsedTime, worldDt, groundY)` | | | changed signature: each moves by `obstacleSpeed(symbol, elapsedTime) × worldDt`; keeps `id`, `symbol`, `typed`; safety filter kept |
| `nextChar(obstacle)` | | string | `symbol[typed]` |
| `activeWord(obstacles)` | | obstacle or null | the one with `typed > 0` |
| `lockTarget(obstacles)` | | obstacle or null | `activeWord(obstacles) ?? findTarget(obstacles)` (`findTarget` unchanged) |
| `typeChar(char, obstacles)` | typed character, obstacles | `TypeResult` | the AC-8 order (with its nearer than active rule and tie break), using `matchesSymbol(char, nextChar(o))`. Called only when at least one obstacle is visible. Never mutates its input; the returned `obstacles` keeps list order, copies only the objects whose `typed` changes, and leaves out a destroyed one. On `miss` nothing changes |
| `spawnSymbolObstacle` | | | unchanged except it sets `typed: 0` |
| `resolveKey` | | | removed (replaced by `typeChar`) |

Reused unchanged: `pickSymbol`, `classifyKey`, `matchesSymbol`, `syntaxSpeed`, `findTarget`, `graceSpeedFactor`, `syntaxScore` (its second argument now gets `destroyedLetters`), `typingStats`, `checkCollision`.

**Canvas changes** (`SyntaxRushCanvas.tsx`):
- Spawn: `symbol = pickSpawn(score, lastSymbol, lastWord, obstacles)` (the whole list, so words not yet visible count for the first letter rule). If it is a word set `lastWord`, otherwise set `lastSymbol`. `spawnInterval = spawnGapAfter(symbol)`. The first gap of a run is unchanged: `resetRun()` still uses `pickSyntaxSpawnInterval()`. `resetRun()` also sets `lastWord = null`.
- Move: `obstacles = advanceSymbolObstacles(obstacles, elapsedTime, worldDt, groundY)`. `distance = syntaxSpeed(elapsedTime) × worldDt` stays for ground, clouds, and particles. A word's speed follows the current `elapsedTime` every frame, so a word on screen speeds up with the world; the guarantee holds because it is checked at top speed.
- Keys, step 6 of the 0002 handler becomes: `r = typeChar(k.char, obstacles)`. `destroyed`: `obstacles = r.obstacles`, then `burstAt(r.obstacle, colors.accent)` (not `removeObstacle`, which would filter again), `destroyedLetters += r.obstacle.symbol.length`, `correctKeys++`, `combo++`, `setCombo`. `progress`: `obstacles = r.obstacles`, `correctKeys++`. `miss`: as 0002 (wrong key, combo 0, flash with its gap).
- Collisions and grace pops keep `removeObstacle(id, colors.danger)` unchanged. Removing the active word that way needs no extra code: the active word is derived from `typed`, so it simply stops existing.
- Draw order becomes: sky, clouds, ground, bugs, particles, mascot, then tiles (visible obstacles in list order, skipping the locked one and lifting any that overlap it, then the locked one last), then flash and layout hint.
- Word tile: same font (`SYMBOL_FONT`, bold 28 world px; a monospace letter is about 17 px wide, inside the 18 px cell), radius, gap, and surface fill as a single tile. Height `SYMBOL_TILE_SIZE`, width `wordLabelWidth`, centered on the bug, bottom at `y - SYMBOL_TILE_GAP`. Each letter is centered in its own `WORD_CHAR_WIDTH` cell, cells starting `WORD_TILE_PADDING` from the tile's left edge. Not locked: every letter muted (an unlocked word always has `typed` 0).
- Locked tile (single or word): height `SYMBOL_TILE_SIZE × TARGET_TILE_SCALE` (52.8), width plus `SYMBOL_TILE_SIZE × (TARGET_TILE_SCALE - 1)` (8.8), still centered on the bug with its bottom at `y - SYMBOL_TILE_GAP` (it grows upward and sideways), accent outline. Letter cells stay the same size, centered as a group.
- Lifted tiles (amendment 2026-11-19): before drawing the other tiles, find the locked tile's center `lockedCx` (its bug's `x + width / 2`) and drawn width `lockedW` (as above, including the 8.8 extra). Another visible tile with center `cx` and its own unlocked drawn width `w` (`SYMBOL_TILE_SIZE` for a single, `wordLabelWidth` for a word) overlaps when `|cx - lockedCx| < (w + lockedW) / 2` (just touching is not an overlap). An overlapping tile is drawn with its bottom at `y - SYMBOL_TILE_GAP - lockedH - TILE_LIFT_GAP`, where `lockedH` is the locked tile's height (52.8) and `TILE_LIFT_GAP = 4 * SCALE` is a new drawing constant at the top of `SyntaxRushCanvas.tsx`. `drawTile` gains an optional `lift` argument (world px, default 0) that it subtracts from the tile's bottom; everything inside the tile (letters, caret) moves with it. Worked out fresh every frame from current positions: no new loop state, nothing to reset. With no locked tile, nothing lifts. Two lifted tiles that overlap each other stay in list order (rare, accepted).
- Locked word letters: typed ones ink at `globalAlpha` 0.45 (set it back to 1 after them), the next one gold, the rest ink. Caret: a gold bar `CARET_HEIGHT` tall and `WORD_CHAR_WIDTH - 4 * SCALE` wide, centered in the next letter's cell, its bottom `4 * SCALE` above the tile's bottom. New drawing constant `CARET_HEIGHT = 1.5 * SCALE`. Colors gain `--color-ink` through the existing `readToken`.

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| Spawn | word or single | `wordChance(score)`, `score = syntaxScore(elapsedTime, destroyedLetters)` |
| Spawn | which word | `wordPool(score)`, `lastWord` (loop state), first letters of words in `obstacles` |
| Spawn | next gap | `spawnGapAfter(symbol)` from the base interval constants and `WORD_SPAWN_GAP_PER_LETTER` |
| Move | per bug speed | `obstacleSpeed(symbol, elapsedTime)` |
| Visibility, lock | tile width of a word | `wordLabelWidth(symbol.length)` from `WORD_CHAR_WIDTH`, `WORD_TILE_PADDING` |
| Key | next expected letter | `symbol[typed]` |
| Key | active word | `activeWord(obstacles)` (derived, `typed > 0`) |
| Draw | locked tile | `lockTarget(obstacles)` |
| Draw | typed, next, rest letters | `typed` on the obstacle |
| Draw | ink color | `readToken('--color-ink', ...)` (token already in `@theme`) |
| Score | points | `destroyedLetters × COIN_VALUE` plus distance (`syntaxScore`) |
| Combo | count | loop `combo`, plus one on `destroyed` only |
| WPM, accuracy | correct, wrong | `correctKeys` (plus one on `destroyed` and `progress`), `wrongKeys` |

**New and changed constants** (`constants/game.ts`, Syntax Rush block, ASCII only, encoding kept):
- Changed: `SYNTAX_SPAWN_INTERVAL_MIN = 0.9`, `SYNTAX_SPAWN_INTERVAL_MAX = 1.6` (retuned 2026-11-19, together with the 0002 speed curve: `SYNTAX_SPEED_INCREASE_RATE = 5 * SCALE`, `SYNTAX_MAX_SPEED = 360 * SCALE`).
- New: `SYNTAX_WORDS_TIER_1 = ['if', 'for', 'int', 'float', 'char', 'else', 'switch', 'while', 'void', 'def', 'elif', 'in', 'not', 'and', 'or', 'pass', 'print', 'len', 'range', 'input', 'true', 'false']`, `SYNTAX_WORDS_TIER_2 = ['struct', 'printf', 'scanf', 'sizeof', 'include', 'lambda', 'import', 'global', 'return', 'continue', 'array', 'class', 'break', 'string', 'boolean', 'function']` (C and Python lists from 2026-11-19; see AC-1).
- New: `WORD_CHANCE_TIER_1 = 0.35`, `WORD_CHANCE_TIER_2 = 0.45`.
- New: `WORD_SPEED_FACTOR = 0.5`, `WORD_LETTER_TIME = 0.4` (s), `WORD_SPAWN_GAP_PER_LETTER = 0.3` (s).
- New: `WORD_CHAR_WIDTH = 11 * SCALE` (was 9; raised to 10 on 2026-11-19 with the tile font going from 14 to 16, and to 11 on 2026-11-21 with the font at 17), `WORD_TILE_PADDING = 6 * SCALE` (world px; in the constants file, not the canvas, because the engine needs them for visibility and speed).

**Resulting numbers** (world px, `SCALE` 2; for tuning, not a test target except the guarantee):

| Letters | Example | Tile width | Visible distance | Speed at start | Speed at top | Visible time at top | Guarantee |
|---|---|---|---|---|---|---|---|
| 1 (single) | `k` | 54 | 924 | 300 | 720 | 1.3 s | 1.0 s |
| 2 | `if` | 68 | 924 | 150 | 360 | 2.6 s | 1.8 s |
| 4 | `else` | 112 | 918 | 150 | 353 (cap) | 2.6 s | 2.6 s |
| 6 | `return` | 156 | 896 | 150 | 264 (cap) | 3.4 s | 3.4 s |
| 8 | `function` | 200 | 874 | 150 | 208 (cap) | 4.2 s | 4.2 s |

At the start of a run every word gets about 6 s.

**Key invariants**:
- At most one obstacle has `typed > 0` (unit test over a sequence of `typeChar` calls with switches).
- `0 <= typed < symbol.length` for every obstacle on the list; a word reaching its length is removed in the same call.
- For every word in both tiers: `wordVisibleDistance(n) / obstacleSpeed(word, Infinity) >= SYNTAX_MIN_VISIBLE_TIME + n × WORD_LETTER_TIME` (unit test). The 0002 single character visible time test stays as is.
- Every word is 2 to 8 characters of `a` to `z`, the two tiers share no word, and each tier has at least two first letters (unit test), so `pickWord` always has a choice.
- No file in 0002 AC-3 is edited.

**Security model**: not applicable (local, offline game).

**Configuration required**: none.

**Critical test scenarios** (`engine/syntaxRush.test.ts`):
- Happy path word: visible `while` (x 600); typing `w h i l e` gives four `progress` results then `destroyed` with that obstacle. Verifies **AC-7**, **AC-8**, **AC-11**.
- Word first: active `let` at progress 1 (next `e`) and a visible single `e` nearer; typing `e` advances `let`, the single stays. Verifies **AC-8**.
- Single while a word is active: active `return` (next `t`), nearer single `k`; typing `k` destroys `k`, `return` keeps progress 2. Verifies **AC-8**.
- Switch: active `string` at progress 3, visible untouched `if` nearer; typing `i` makes `if` active (progress 1) and `string` drops to 0. Verifies **AC-8**, invariant.
- No switch away: active `string` at progress 3 (x 400), visible untouched `if` farther (x 900); typing `i` is a `miss`, `string` keeps progress 3. Verifies **AC-8**, **AC-9**.
- Tie: two matching singles at the same `x`; the first in list order is destroyed. Verifies **AC-8**.
- Pure result: after `typeChar`, the input array and its objects are unchanged and the output keeps list order. Verifies **AC-19**.
- Sequence invariant: from a fixed list of words and singles, feed a fixed sequence of 50 keys from a seeded random; after every call at most one obstacle has `typed > 0` and every `typed` is in `[0, symbol.length)`. Verifies **AC-7**, **AC-8**.
- Wrong key keeps progress: active `const` at progress 2, typing `z` with nothing matching gives `miss`, obstacles unchanged. Verifies **AC-9**.
- Case and layout: typing `W` advances `while`; key `ц` with code `KeyW` (classified by 0002 `classifyKey`) advances it too. Verifies **AC-8**.
- Lock: `lockTarget` returns the active word even when a single is nearer; with no active word, the nearest visible. Verifies **AC-10**.
- Visibility: an 8 letter word whose bug is fully on screen but whose tile pokes past 1280 is not visible; a single at the same bug `x` is. Verifies **AC-6**.
- Picking: `wordPool(199)` has 10, `wordPool(200)` has 18; `wordChance` equals `WORD_CHANCE_TIER_1` at 199 and `WORD_CHANCE_TIER_2` at 200, and tier 2 is higher; `pickWord` never returns `lastWord`, skips `loop` while `let` is on screen (even off screen), and falls back when every first letter is taken; `pickSpawn` with first random 0.1 at score 0 returns a word, with 0.5 a single; `pickSpawn` with `lastSymbol = 'a'` and a word spawned in between still never returns `a` as a single. Verifies **AC-1**, **AC-2**, **AC-3**.
- Gaps: `spawnGapAfter('k', () => 0)` is `SYNTAX_SPAWN_INTERVAL_MIN` (0.9); `spawnGapAfter('return', () => 0)` is 0.9 + 1.8 = 2.7. Verifies **AC-4**.
- Speeds: `obstacleSpeed('k', t)` equals `syntaxSpeed(t)`; `obstacleSpeed('if', 0)` is 150; `obstacleSpeed('function', 1000)` equals `wordSpeedCap(8)`; the guarantee invariant over all words. Verifies **AC-5**.
- Advance: two obstacles, a single and a word, move by different distances in one call; `typed` is kept. Verifies **AC-5**, **AC-16**.
- Score: `syntaxScore(10, 8)` is 180 (100 for 10 s of distance plus one `function` as 8 letters); `syntaxScore(0, 8)` is 80. Verifies **AC-13**.
- Manual: combo goes up once per word, not per letter; WPM after a run with words reads higher than letters only. Verifies **AC-14**, **AC-15**.
- Manual: the locked word shows faded typed letters, a gold next letter with a caret, and stays readable when it walks past the mascot; a destroyed word bursts blue. Verifies **AC-10**, **AC-11**.
- Manual (lift): a fast single passing a locked word shows its tile lifted above the word tile while they overlap, then back in place; a locked single passing a word lifts the word's tile, so all its letters stay readable; with no overlap nothing lifts; a lifted single can still be typed, and still costs a life if it reaches the mascot. Verifies **AC-10**.
- Manual: let a half typed word reach the mascot (life lost, no word locked afterwards), and again during grace (it pops, nothing else changes). Verifies **AC-12**.
- Manual: pause with a half typed word, resume, its progress is still there; quit and start again, no word is active. Verifies **AC-16**.
- Manual: the menu shows the new hint. Verifies **AC-17**.

## Build plan

No build approach is recorded for this project, so this follows thin end to end slices: a typeable word on screen first, then the full display, then tuning.

1. [x] Constants (changed spawn gaps, word lists, chances, speed and width constants) and `typed` plus `TypeResult` in `engine/types.ts`, satisfies **AC-1**, **AC-4**, **AC-5**.
2. [x] Engine: word pool and picking, `pickSpawn`, `spawnGapAfter`, label width, `rightEdge` and the new `visibleObstacles`, speeds and the new `advanceSymbolObstacles`, `nextChar`, `activeWord`, `lockTarget`, `typeChar`; remove `resolveKey`; tests above plus the invariants, satisfies **AC-1** to **AC-9**, **AC-13**, **AC-19**.
3. [x] Tracer slice in `SyntaxRushCanvas.tsx`: spawn with `pickSpawn` and `spawnGapAfter`, per bug movement, key handler on `typeChar`, `destroyedLetters` in the score, a plain word tile (all letters, typed ones faded), satisfies **AC-5**, **AC-6**, **AC-8**, **AC-9**, **AC-11** to **AC-16**.
4. [x] Lock display: `lockTarget`, tiles moved after the mascot, locked tile drawn last and larger, gold next letter with caret, faded typed letters, `--color-ink` read, satisfies **AC-10**.
5. [x] Menu hint text, satisfies **AC-17**.
6. [x] Check Classic Runner and scope: full test suite, `git diff --stat` shows only the files in AC-18, one Classic run, satisfies **AC-18**.
7. Playtest on a 1024 px window and a 1366 × 768 laptop: tune `WORD_CHANCE_*`, `WORD_LETTER_TIME`, `WORD_SPAWN_GAP_PER_LETTER`, and the spawn gaps if the load feels off, satisfies **AC-2**, **AC-4**, **AC-5**.
8. [x] Lift overlapping tiles (amendment 2026-11-19): `TILE_LIFT_GAP`, the overlap test against the locked tile, and the `lift` argument on `drawTile`, in `SyntaxRushCanvas.tsx` only (no engine change), satisfies **AC-10**.

## Consequences

**Positive**:
- Syntax Rush now trains real keywords, not just isolated keys, with no new file, dependency, or store field.
- The fairness rule gets stronger, not weaker: every word gets its own minimum window that grows with its length.
- WPM finally counts real words, so the stat reads closer to what students expect.
- Classic Runner is untouched.

**Negative / tradeoffs**:
- More keys per second are needed overall (roughly 15 WPM sustained in tier 1 and 18 in tier 2, against about 10 today). The tuning constants are the lever if beginners struggle.
- Bugs now move at different speeds, so a fast single can pass through a slow word. Their bugs overlap for a moment, and a tile that overlaps the locked tile jumps up a row and back (a one frame snap each way, usually under 1 s apart). Every character stays readable; the jump is the price.
- Words walk slower than the ground scrolls, so word bugs look like they are walking away from the mascot. It reads as "running from you", but it is a visual quirk.
- A typo that happens to start another visible word that is nearer than the active one switches to it and drops the old word's progress. Rare (AC-3 keeps first letters apart on screen, and a farther word can never take over), and the cost is retyping a few letters.
- Tier 2 now arrives a bit sooner, because finished words add more points.
- The locked word tile can stick out a few px past the right edge when it is the only bug and just became visible (the 1.2 growth is not counted in visibility). Accepted.

**Neutral**:
- `resolveKey` and its tests go away; `advanceSymbolObstacles` changes signature.
- `--color-ink` is now read by the Syntax Rush canvas.

## Follow-up

- [ ] Playtest the word load with a real beginner and tune the constants in build step 7.
- [ ] Deferred (accepted 2026-11-19): word bugs look like they walk backwards against the ground. Consider drawing them mirrored (facing right) so it looks intentional.
- [ ] Docs only: 0002 `index.md` and `verify.md` quote the old menu hint "Type the key on each bug". Leave 0002 as its record; `/sync` can note the new text.
- [ ] Consider a small sound or tick per correct letter (needs approval, AGENTS.md says no audio without asking).
- [ ] Consider more words (`async`, `await`, `typeof`, `default`) after playtesting; keep them letters only.
- [ ] Update `AGENTS.md` (via `/sync`) with the word obstacle rule (one active word, keys go to it first).

## Rationale

See [rationale.md](rationale.md) for the context, the options considered, and the reasoning behind each recommendation.
