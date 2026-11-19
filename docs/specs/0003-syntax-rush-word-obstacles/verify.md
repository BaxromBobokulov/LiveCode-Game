# Verify: Syntax Rush word obstacles · spec 0003 · updated 2026-11-19
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Tip: run the dev server (`npm run dev`) in a desktop window at least 1024 px wide, keep it in the foreground (a background window runs the game at a fraction of normal speed), and start Syntax Rush from the menu.

## UI / manual

Words and spawning
- [x] Play 30 s → about one bug in five carries a word from `if for let var else true null loop const while`; no word longer than 5 letters appears → AC-1, AC-2
- [x] Pass score 200 → longer words (`return`, `string`, `function`, …) start to appear, and words come more often (about one in three) → AC-1, AC-2
- [x] Two words starting with the same letter are never on screen together (e.g. `let` and `loop`); the same word never spawns twice in a row → AC-3
- [x] Bugs come noticeably closer together than before; right after a long word there is a short breather before the next bug → AC-4
- [x] Two single characters in a row never show the same character, even with a word spawned between them → AC-2

Speed and fairness
- [x] Single character bugs overtake word bugs; words walk clearly slower → AC-5
- [x] Near top speed (after about 30 s), `function` still stays readable on screen for about 4 s before it reaches the mascot → AC-5
- [x] A long word's tile appears only once the whole tile is inside the screen, not just the bug → AC-6

Typing and display
- [x] Type a word's first letter → its tile grows, gets the blue outline, the typed letter fades, the next letter turns gold with a bar under it → AC-7, AC-10
- [x] Finish the word → it bursts in blue and disappears; the combo goes up by 1 (not by the word's length) → AC-11, AC-14
- [x] Mid word, type a wrong letter → red edge flash, combo resets, the word keeps the letters already typed → AC-9
- [x] Mid word, type a single bug's character (one that is not the word's next letter) → that single bursts and the word keeps its progress → AC-8
- [x] Mid word, when a single shows the same letter the word needs next → the word moves on, the single stays → AC-8
- [x] Mid word, type the first letter of a word that is nearer the mascot → you switch to that word and the old one goes back to zero → AC-8
- [x] Mid word, type the first letter of a word farther away than the one you are typing → wrong key (flash), no switch → AC-8, AC-9
- [x] With a word in progress and a single nearer, the word stays the locked (outlined) tile → AC-10
- [x] A word walking past the mascot stays readable on top of the mascot sprite → AC-10
- [x] Type a word with Caps Lock on, and on a Russian layout → letters still count → AC-8

Lifted tiles (amendment 2026-11-19)
- [x] A fast single catches up with a locked word: as soon as their tiles would overlap, the single's tile jumps up one row above the word tile (still over its own bug) and its character stays readable → AC-10
- [x] Once the single passes the word and becomes the locked (outlined) tile, the word's tile jumps up one row instead, so every letter of the word stays readable → AC-10
- [x] When the tiles no longer overlap, both drop back to their normal height in the same moment; tiles far apart never move → AC-10
- [x] A lifted single can still be typed, and still costs a life if it reaches the mascot; the bugs themselves never move up → AC-10

Lives, score, stats
- [x] Let a half typed word reach the mascot → one life lost, the word bursts red, no word is locked afterwards → AC-12
- [x] Same during grace (right after losing a life) → the word pops red, nothing else changes → AC-12
- [x] Finish `if` → the score jumps by 20 (plus distance); finish a single → by 10 → AC-13
- [x] After a run with several words, Game Over shows a WPM higher than a letters only run would; accuracy still counts wrong keys → AC-15
- [x] Pause with a word half typed, wait, resume → its progress is still there → AC-16
- [x] Quit to Menu mid word, start again → no word is locked or half typed → AC-16
- [x] The menu hint reads "Type the letter, symbol or word on each bug. Esc pauses." → AC-17
- [x] Play one Classic Runner run on desktop and one at phone width → unchanged (jumping, platforms, dust) → AC-18

Tuning (build plan step 7)
- [ ] On a 1024 px window and a 1366 × 768 laptop, the word load feels fair for a beginner; if not, tune `WORD_CHANCE_*`, `WORD_LETTER_TIME`, `WORD_SPAWN_GAP_PER_LETTER`, `SYNTAX_SPAWN_INTERVAL_*` in `src/constants/game.ts` → AC-2, AC-4, AC-5

## Value sourcing checks
- [x] Word or single (`wordChance(score)`): the word share changes at score 200 → AC-2
- [ ] Which word (`wordPool`, `lastWord`, words on screen): first letter rule holds even for a word that has not fully entered yet → AC-3
- [x] Next gap (`spawnGapAfter`): longer pause after `function` than after `if` → AC-4
- [x] Per bug speed (`obstacleSpeed`): a word on screen speeds up a little as the run goes on, but never faster than half the single speed → AC-5
- [x] Tile width (`wordLabelWidth`): the drawn tile fits its letters exactly, no clipped or loose letters, for `if` and `function` → AC-6, AC-10
- [x] Next letter (`symbol[typed]`) and active word (`typed > 0`): only ever one tile shows a caret → AC-7, AC-10
- [x] Locked tile (`lockTarget`): the active word, else the nearest bug → AC-10
- [x] Ink color (`--color-ink`): untyped letters of the locked word are white, unlocked words are muted grey → AC-10
- [x] Points (`destroyedLetters × 10` plus distance) → AC-13
- [x] Combo (only on a destroyed bug) and correct keys (also on each word letter) → AC-14, AC-15

## Commands
- [x] `npx vitest run` (from PowerShell) → all tests pass, including `src/engine/syntaxRush.test.ts` word tests → AC-19
- [x] `npx tsc -b` → no errors → AC-18
- [x] `git diff --stat` against the commit before this build → code changes only in `src/engine/syntaxRush.ts`, `src/engine/syntaxRush.test.ts`, `src/engine/types.ts`, `src/constants/game.ts`, `src/features/game/SyntaxRushCanvas.tsx`, `src/features/game/MainMenu.tsx` → AC-18

## Acceptance criteria coverage
- AC-1 to AC-4: words and spawning steps, value sourcing (word or single, which word, next gap), unit tests
- AC-5, AC-6: speed and fairness steps, tile width check, unit tests (guarantee over every word, visibility)
- AC-7 to AC-10: typing and display steps, unit tests (`typeChar`, `lockTarget`, sequence invariant)
- AC-11 to AC-16: lives, score, stats steps
- AC-17: menu hint step
- AC-18: Classic run step, typecheck and diff commands
- AC-19: vitest command
