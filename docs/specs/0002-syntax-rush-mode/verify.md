# Verify: Syntax Rush typing mode · spec 0002 · updated 2026-11-18
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Tip: run the dev server (`npm run dev`) on a desktop window at least 1024 px wide. A real hand is better than browser automation here: automated browsers throttle animation frames, which makes the game crawl.

## UI / manual

Menu and gating
- [ ] Open the app fresh → Play has focus; press Enter → Classic Runner starts (no hearts in the HUD, background shapes visible) → AC-1
- [ ] Back on the menu, the Syntax Rush button sits after Play's block, shows "Best N", with the hint "Type the key on each bug. Esc pauses." → AC-1
- [ ] Shrink the window below 1024 px wide (or use a phone emulator) → the Syntax Rush button fades, clicking it does nothing, the note reads "Syntax Rush needs a keyboard. Try it on a computer."; widen again → it enables live → AC-2
- [ ] On a 1366 × 768 laptop window, the whole menu fits without scrolling → AC-1
- [ ] On a phone width, Classic Runner still plays exactly as before (tap to jump, platforms, dust) → AC-3

Obstacles and typing
- [ ] Start Syntax Rush → bugs walk in from the right; no jump on Space, ↑ or click → AC-4
- [ ] A bug's tile appears only once the whole bug is on screen → AC-8
- [ ] Early in a run, most bugs carry lowercase letters and about one in four a symbol from `; = ( ) { }`; after the score passes 200, symbols like `[ ] < > : +` appear and about half the bugs carry symbols → AC-5
- [ ] Two bugs in a row never carry the same character → AC-6
- [ ] With two bugs on screen, the nearer one's tile is bigger, outlined in blue, with a gold character; the other is smaller and muted → AC-8
- [ ] Type the nearer bug's character → it bursts into blue particles and disappears; the score jumps by 10 and the combo shows x1 → AC-9, AC-10, AC-16, AC-17
- [ ] Type the farther bug's character while it is fully on screen → that bug is destroyed, not the nearer one → AC-9
- [ ] With Caps Lock on, type a letter bug's key → it is still destroyed → AC-9
- [ ] Type `{` on a layout that needs Shift or AltGr for it → it destroys a `{` bug → AC-9
- [ ] Press a key that no visible bug shows → red flash along the screen edges, combo resets, no life lost → AC-11
- [ ] Mash wrong keys fast → the flash never strobes faster than about 3 times a second → AC-11
- [ ] Press Space, Shift, Tab, Ctrl+C, and hold a letter down → nothing counts, no flash, the page never scrolls → AC-12
- [ ] Press `/` in Firefox before the first bug appears and between bugs → quick find never opens → AC-13
- [ ] Press Esc → paused panel with "Press Esc to resume"; Esc again resumes; P does nothing → AC-14
- [ ] Switch to another tab or window during a run → it pauses → AC-14
- [ ] Switch the system keyboard to Russian or another Cyrillic layout, then type letters → they still destroy letter bugs, and a hint "Switch to an English keyboard layout for code symbols" shows once for about 3 s → AC-9, AC-15

Lives, grace, game over
- [ ] Let a bug reach the mascot → one heart turns dark, the bug bursts red, combo resets → AC-18
- [ ] Right after, the mascot blinks for about 2 s, the world runs at half speed then eases back; a bug reaching it during that time pops harmlessly → AC-19
- [ ] Lose the third life → the Syntax Rush Game Over screen shows score, best, WPM and accuracy → AC-20, AC-21
- [ ] On Game Over, no button has focus, and clicks in the first 400 ms do nothing → AC-21
- [ ] Play Again starts a new Syntax Rush run with 3 hearts; Back to LiveCode returns to the menu → AC-21, AC-24
- [ ] A run with no counted keys shows WPM 0 and accuracy "–"; a run with one right and one wrong key shows 50% → AC-22
- [ ] Beat the Syntax Rush best → the menu shows the new best; the Classic "High Score" is unchanged → AC-23
- [ ] Pause with bugs on screen, wait, resume → everything continues from exactly where it was (bugs, hearts, combo, blink) → AC-24
- [ ] Quit to Menu mid run → the run does not count toward the best → AC-23, AC-24
- [ ] Resize the window mid run → the mascot stays on the ground and bugs keep the same timing → AC-7, AC-24

## Value sourcing checks
- [ ] Spawn pool and mix (`letterChance`, `codeSymbols` from the full score): typing well (coins) brings tier 2 sooner than surviving alone → AC-5
- [ ] Previous character (`lastSymbol`): never two identical characters in a row over a long run → AC-6
- [ ] Spawn x and ground (`SYNTAX_VIEW_WIDTH`, `getGroundY`): bugs enter at the right edge and stand on the ground at any window height → AC-4, AC-7
- [ ] View scale (`syntaxViewScale(canvas width)`): the same number of bugs fit across a 1024 px and a 1920 px window → AC-7
- [ ] "Fully on screen" edge: a half entered bug has no tile and cannot be typed → AC-8
- [ ] Colors (tokens via `readToken`, plus `--color-danger`): target gold and blue, others muted, flash and lost hearts red → AC-8, AC-11, AC-18
- [ ] Typed character (`event.key`, `event.code` fallback): Latin layout, Shift, AltGr and Cyrillic layouts behave as above → AC-9
- [ ] Score (`elapsedTime`, `destroyed`): each destroyed bug adds exactly 10 → AC-17
- [ ] Lives and combo in the HUD (store, set on change only): hearts and combo update immediately → AC-16, AC-18
- [ ] Grace and flash timers (real time): both freeze while paused → AC-19, AC-24
- [ ] Reduced motion (`prefers-reduced-motion`): the wrong key flash is fainter → AC-11
- [ ] WPM (`correctKeys`, `activeTime`): a long pause in the middle of a run does not lower the WPM → AC-22
- [ ] Accuracy (`correctKeys`, `wrongKeys`): ignored keys (Shift, Space) never change it → AC-12, AC-22
- [ ] Syntax best (`getSyntaxBestScore` / `setSyntaxBestScore`): survives a page reload, stored under `livecode-game-bestscore-syntax` → AC-23
- [ ] Desktop gate (`matchMedia` fine pointer plus `innerWidth`): browser zoom to 200% on a 1366 px window disables the button → AC-2

## Commands
- [ ] `npx vitest run` (from PowerShell) → all tests pass, including `src/engine/syntaxRush.test.ts` and the Syntax Rush blocks in `gameStore.test.ts` and `storage.test.ts` → AC-25, AC-3
- [ ] `npx tsc -b --noEmit` → no errors → AC-25
- [ ] `git diff --stat` → none of the AC-3 files appear (`GameCanvas.tsx`, `Hud.tsx`, `GameOverScreen.tsx`, `ScreenFrame.tsx`, `Button.tsx`, `ScoreBadge.tsx`, `physics.ts`, `spawner.ts`, `collision.ts`, `score.ts`, `terrain.ts`, `viewport.ts`) → AC-3

## Acceptance-criteria coverage
- AC-1 … menu steps · AC-2 … gate step, zoom check · AC-3 … phone Classic step, git diff, test suite · AC-4 … start step · AC-5 … mix step, `codeSymbols`/`pickSymbol` tests · AC-6 … no repeat step and test · AC-7 … view scale and resize steps, fairness test · AC-8 … tile and target steps, `findTarget` tests · AC-9 … typing steps, `resolveKey`/`classifyKey`/`matchesSymbol` tests · AC-10 … burst step · AC-11 … flash steps · AC-12 … ignored keys step, `classifyKey` tests · AC-13 … quick find step · AC-14 … pause steps · AC-15 … Cyrillic step · AC-16 … combo steps · AC-17 … score step, `syntaxScore` test · AC-18 … life lost step · AC-19 … grace step, `graceSpeedFactor` tests · AC-20 … last life step · AC-21 … Game Over steps, store tests · AC-22 … stats steps, `typingStats` tests · AC-23 … best score steps, store and storage tests · AC-24 … pause, quit, resize steps · AC-25 … engine test file
