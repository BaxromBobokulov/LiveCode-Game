# 0002. Syntax Rush typing mode: rationale

Decision history for [index.md](index.md). Not needed to build; read it to understand why.

## Context

LiveCode Game has one mode today, Classic Runner: the mascot runs, you jump over obstacles, and it works on phones and computers. The user wants a second mode for variety, Syntax Rush, where you type the code symbol shown on each incoming obstacle to destroy it. Several design calls were already made by the user and are not reopened here: a wrong key costs no life (it resets the combo and flashes red), the nearest obstacle's symbol is highlighted, 3 lives with a grace period after each loss, WPM and accuracy on Game Over, coins as plain score only in v1, a mode choice on the main menu, desktop only, and no change at all to Classic Runner's code, assets, or behavior.

The forces at play:
- **AGENTS.md rules.** Engine code is pure TypeScript with no DOM or React, works in px and seconds, returns new objects, and takes `random` as an argument. One Zustand store, read with selectors, updated at low frequency. A mechanic should be understandable from one engine file.
- **Classic Runner must not move.** It was the default when this spec was written (since 2026-11-19 it is the default only on devices that fail the gate, see H), it is mobile friendly, and it is covered by tests. The safest way to honor "no change" is to not edit its files at all.
- **The existing loop is one large closure.** `GameCanvas.tsx` (about 700 lines) owns scenery, physics, platforms, dust, and drawing in one `useEffect`. Branching it by mode would put Syntax Rush code inside Classic's file.
- **Typing is slower than jumping.** Finding a shifted symbol takes a beginner well over the 0.5 s Classic gives on a phone, so Syntax Rush needs its own, slower speed curve and a guaranteed reaction window.
- **Keyboards differ.** Many students do not use a US layout. `{` is AltGr+7 on German keyboards, and quote keys are dead keys on US International.
- **Audience.** Beginners, often on a break. Feedback must be kind, readable, and safe (a red flash that can be triggered by mashing must stay within safe flash rates).

If nothing is decided, the builder would have to invent the symbol set, the key matching rule, the scoring, the grace timing, the stat formulas, and the gating, and most of those choices decide whether the mode feels fair.

## Options considered

### Option 1: A separate canvas and engine file, sharing the one store

New `SyntaxRushCanvas.tsx`, `SyntaxRushHud.tsx`, `SyntaxRushGameOver.tsx`, and `engine/syntaxRush.ts`. The store gains `mode` and a few fields. `App.tsx` mounts the right screens by mode.

**Pros**:
- Classic Runner files are not edited at all, which is the simplest proof that its behavior did not change.
- The typing mechanic lives in one pure file, as AGENTS.md asks.
- Keeps the single store rule; pause, resume, quit, and the status lifecycle work the same way in both modes.

**Cons**:
- Scenery drawing and the particle pool are repeated in the new canvas.
- The store holds a few fields only one mode uses.

### Option 2: Branch the existing GameCanvas by mode

Add `if (mode === 'syntax')` branches to `GameCanvas.tsx`, `Hud.tsx`, and `GameOverScreen.tsx`.

**Pros**:
- No repeated drawing code.
- Fewer new files.

**Cons**:
- Edits every Classic file, which breaks the confirmed "Classic code must not change" rule.
- Makes a 700 line closure larger and harder to read, with two input models mixed in one handler (Space jumps in one mode, is ignored in the other; P pauses in one mode, is a letter in the other).

### Option 3: A separate store and a separate app entry

Syntax Rush gets its own Zustand store and its own top level component tree.

**Pros**:
- Total isolation, even in the store.

**Cons**:
- Breaks the "one store" rule in AGENTS.md.
- Duplicates the status lifecycle (pause, resume, blur, quit) that already works and is tested.

## Rationale

Option 1 is the only one that keeps both hard rules at once: Classic files untouched, and one store. The cost is some repeated drawing code, which is visible and easy to remove later with a deliberate, behavior preserving extraction (listed in Follow-up). Repetition is the lesser risk here: an extraction now would edit Classic Runner as part of a feature that promised not to.

Answers to the open questions, each with the pick, why, and the runner up:

**A. Symbol set (revised 2026-11-18 after review: letters included).** Two pools, letters and code symbols, mixed by a per tier chance rather than thrown into one list. If all 26 letters and 6 symbols sat in one uniform pool, symbols would show up only 6 times in 32 and their share would be an accident of list sizes; a separate chance keeps the mix a single tunable number.
- Letters: all 26 lowercase, `a` to `z`, from the start. Every key a beginner types in a keyword or a name; easy to find, so they carry the opening seconds.
- Tier 1, from the start: code symbols `; = ( ) { }` (statements, assignment, calls, blocks). 75 percent of spawns are letters, 25 percent symbols, so about one bug in four asks for a symbol while the player warms up.
- Tier 2, from a full score of 200 (distance plus coins; about 15 to 20 s for a struggling player, about 13 s for one typing well, since coins speed it up): symbols gain `[ ] < > : +` (arrays, comparisons, objects and Python blocks, operators), and the mix moves to 50 percent letters, 50 percent symbols. Difficulty grows from the symbols, which are the characters beginners actually hunt for, while letters keep the flow going.
- Each spawn rolls the pool first, then picks uniformly inside it, never repeating the previous character.
- Letters match in either case. Without that, Caps Lock left on would turn every letter into a wrong key and a beginner would not know why. Code symbols match exactly (Shift is part of typing them).
- Quote keys stay out because they are dead keys (they wait for the next key) on US International and many European layouts. Matching uses `event.key` (the produced character), so Shift and AltGr layouts work everywhere.

Runner up: a third tier that ramps letters down to 25 percent late in a run (more pressure on symbols, but one more knob to tune before anyone has played it).

**B. Same symbol on two obstacles.** The keypress destroys the nearest visible obstacle with that symbol. Any visible obstacle can be destroyed, not only the target; the target highlight is a hint about what is most urgent, not a rule that punishes typing another visible symbol. This is kinder for beginners and makes "wrong key" mean only "that symbol is not on screen". Only fully visible obstacles count, so a half entered bug with a cut off label cannot be hit by a lucky press. Runner up: strict mode, where only the target counts and any other key is wrong (more skill, but harsh for this audience).

**C. Combo.** Purely visual in v1: a "x7" counter in the HUD that resets on a wrong key and on a life lost. No multiplier. This is the smallest useful version: it gives the satisfying feedback, and the score stays legible (distance plus 10 per bug). A multiplier can be added later by changing one function, `syntaxScore`. Runner up: a multiplier that steps up every 10 combo, capped at x3.

**D. Grace period.** 2.0 s total. The world runs at half speed for 1.5 s, then eases back to full over 0.5 s, so the restart is not a jolt. The mascot blinks between full and 35 percent opacity every 0.1 s, which is the classic "you are safe" signal. Obstacles that reach the mascot during grace pop harmlessly, so losing a life can never chain into losing two. Slowing world time (not just the scroll) keeps spawn spacing and the speed ramp consistent. The distance score also accrues at half rate during grace, which is a small, fair cost of losing a life. Runner up: invincibility only, no slowdown (simpler, but the user asked for the slowdown).

**E. WPM and accuracy.** The standard formula, with two beginner friendly choices: WPM counts only correct keys (so mashing cannot inflate it), divided by 5, over active minutes (pauses excluded, grace counted at real time). Accuracy is correct over counted keys, rounded down so 100 percent always means no mistakes at all, with ignored keys (modifiers, Space, repeats, presses with nothing on screen) left out, so a stray Shift never lowers it. Flagged: because the game sets the pace, WPM will read about 10 to 30, lower than a typing test. It is still labelled WPM because students recognise it; the honest alternative label is "symbols per minute". Runner up: show symbols per minute instead of WPM.

**F. Engine reuse.** Reused as is: `calculateScore`, `checkCollision`, `OBSTACLE_SIZES`, the mascot size and position, the store's status lifecycle, and the storage pattern. Not reused: `physics.ts` (no jump), `terrain.ts` (no platforms), `spawner.ts` and `currentSpeed` (Classic's speeds and spawn gaps are tuned for jumping and are hardcoded to Classic constants; changing them to take parameters would edit Classic code). Syntax Rush gets its own small versions in `engine/syntaxRush.ts` (`syntaxSpeed`, `pickSyntaxSpawnInterval`, `advanceSymbolObstacles`), each a few lines.

**G. Desktop gating.** Gate on input capability plus room: `(hover: hover) and (pointer: fine)` and a window at least 1024 CSS px wide. Pointer capability is a better proxy for "has a real keyboard" than width alone (a big tablet is wide but has no keyboard). The width now only guarantees that tiles stay readable (the view scale is at least 0.8), because the reaction window is fixed by the view width (see "Fixed view width" below). A phone user still sees the Syntax Rush button, marked `aria-disabled` (not native `disabled`, which would hide it and its note from keyboard and screen reader users), with a short note, so the mode is discoverable and the reason is clear. The same gate applies to Play Again on the Syntax Rush Game Over screen, so shrinking the window between runs cannot slip past it. The check updates live. A run already in progress is never stopped, since shrinking the window mid run only shrinks the drawing. Runner up: hide the button entirely on phones (cleaner menu, but students would never learn the mode exists).

**Fixed view width (added after the cross check).** Classic's `drawScale` draws at half size whenever the window is shorter than 680 px, which includes most 1366 × 768 laptops. Reused here, it would have doubled the visible track on those laptops (about 4 s to react instead of about 1.1 s) and made difficulty depend on window height. Syntax Rush instead always shows exactly 1280 world px across, scaled to the window's width. Every desktop gets the same reaction time (about 1.54 s at top speed), scores are comparable between screens, a mid run resize changes nothing about timing, and huge monitors do not become trivially easy. Runner up: keep `drawScale` but cap the world width at 1280 (fixes wide screens, but short screens still differ).

**Non Latin keyboard layouts (added after the cross check).** Many LiveCode students use Cyrillic layouts (Uzbek, Russian). Matching on `event.key` alone would make every letter a wrong key there. For letters, the physical key (`event.code`, `KeyA` to `KeyZ`) is used as a fallback, so letters always work. Code symbols cannot be mapped that way (they sit on different keys per layout), so a one time hint asks the player to switch to an English layout. IME composition keys are ignored rather than counted wrong.

Smaller calls made here, each with the runner up:
- **Score = distance + 10 per destroyed bug.** Distance keeps it comparable in feel to Classic; the per bug coins (decision 5) reward typing. Runner up: score from destroyed bugs only.
- **Separate best score per mode** under a new key. Mixing the two would make Classic bests unreachable or meaningless. Runner up: one shared best.
- **Esc only pauses in Syntax Rush.** P is a letter key and could be a future symbol. Runner up: keep P and accept the clash.
- **Space ignored, not counted wrong.** Players coming from Classic will press it by habit.
- **Bug sprite only for obstacles.** The brace tile would visually clash with the symbol label ("a brace showing a semicolon"). Runner up: reuse both sprites.
- **Red edge flash, not full screen, rate limited to 3 per second.** Stays inside the WCAG 2.3.1 three flashes guideline even when mashing. Runner up: a red tint on the mascot only.
- **New `--color-danger` token** rather than a hardcoded red, per the design token rule.

**H. Play button swap (amended 2026-11-19).** The original AC-1 kept Play on Classic Runner so the menu stayed exactly as before for existing players. After shipping, the user decided the new mode should be the headline on computers: Play starts Syntax Rush wherever the gate passes, and Classic Runner moves to a clearly labelled secondary button. On devices that fail the gate, Play still starts Classic Runner, because Play must never point at a mode the device cannot run. Both layouts read the same `useCanPlaySyntaxRush()` value, so no new gating rule was added and Classic's own files stay untouched (AC-3 holds; only `MainMenu.tsx` changed). Each mode's best score and hint move with its button, so the badge under Play always matches the mode Play starts. Accepted cost: on desktop, Space or Enter on a fresh menu now starts Syntax Rush, and the menu swaps live if the window crosses 1024 px. Runner up: keep the original order (Classic as Play everywhere), which is safer for existing players but hides the newer mode behind a secondary button on the devices that can play it.

**I. Difficulty retune (amended 2026-11-19).** The first shipped curve (ramp 3, top 300, gaps 1.3 to 2.4 s) felt barely harder over a run, so it was pushed to ramp 8, top 420, gaps 0.8 to 1.5 s (later 0.7 to 1.3 s by 0003). Students then died too fast: almost none reached a score of 1000. Commit a07971b settles between the two: ramp 5, top 360 (reached at 42 s), gaps 0.9 to 1.6 s. Speed still doubles within 30 s, so the run clearly gets harder, and a single character at top speed is fully visible for about 1.28 s, above the 1.0 s floor. The word side of the same retune is in 0003's rationale.md.

## Cross check (2026-11-18)

An independent read only review on a second model checked the spec against the code. It confirmed the claims about the existing code (`drawScale`, `OBSTACLE_SIZES[1]` is 100 × 84, `checkCollision` accepts a `SymbolObstacle`, the store and App behavior, the Classic status subscription) and the overall design. It raised 2 bugs and about 25 gaps, all fixed in `index.md` on the engineer's standing instruction:
- Bugs: `preventDefault()` was skipped when no bug was on screen (so `/` could open quick find early in a run); `drawScale` made reaction time depend on window height. Fixed with the new key handling order and the fixed view width.
- Gaps closed: Play Again gate; non Latin layouts and IME; exact key classes (Space, Enter, repeats, Escape repeat); loop lifecycle, `MAX_DT`, reset values, first spawn, flash and grace timers; blink formula; particle pool size and colors; tile and flash look; reduced motion; which Classic helpers are copied and which assets are used; corrected stats test cases and floor rounding for accuracy; the gate hook's home and its guard for missing `matchMedia`; accessible disabled button and menu copy; several overlaps in one frame; store staleness after `resetToMenu`, single `set` starts, change guarded setters; the full score feeding the tier switch; grace clamping and no stacking; the full AC-3 file list; ASCII only edits to the mis encoded constants file; HUD and canvas accessibility labels.
- Kept as is: separate canvas and engine with one store (judged the simplest way to guarantee AC-3); no shared scenery extraction now.

## References

None (level `none`). Recommendations come from the existing code, `AGENTS.md`, spec 0001, and general game and typing tutor practice.
