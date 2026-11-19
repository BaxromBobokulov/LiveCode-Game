# 0002. Syntax Rush typing mode

**Date**: 2026-11-18
**Status**: Accepted
**Amended by**: [0003](../0003-syntax-rush-word-obstacles/index.md) (word obstacles; Accepted, not built yet)

## Summary

Syntax Rush is a second game mode next to Classic Runner. Bugs walk toward the mascot, each holding up one character (a letter such as `k`, or a code symbol such as `;` or `{`), and you type that character to blow the bug apart before it reaches you. There is no jumping; the keyboard is the only input, so the mode is for computers only. You have 3 lives, a wrong key only breaks your combo, and the Game Over screen adds your typing speed (WPM) and accuracy. It is built as its own canvas component, its own pure engine file, and a few new fields in the existing store, so Classic Runner's code and behavior stay exactly as they are.

## Requirements

**User stories**:
- As a student on a break, I want a second, keyboard based mode so the game stays fresh after I have played Classic Runner a lot.
- As a beginner programmer, I want to practise finding letters and then code symbols like `{ } ( ) ;` on the keyboard, so typing real code feels less slow.
- As a student on a phone, I want to see clearly that Syntax Rush needs a keyboard, instead of starting a mode I cannot play.

**Acceptance criteria**:

Mode select and gating
- **AC-1**: The main menu offers Syntax Rush after the existing Play button. Play still starts Classic Runner, keeps its autofocus, and Space or Enter on a fresh menu still starts Classic Runner. The Syntax Rush button has no autofocus.
- **AC-2**: Syntax Rush can only be started when the device has a fine pointer with hover (`(hover: hover) and (pointer: fine)`) and the window is at least `SYNTAX_MIN_WIDTH` (1024) CSS px wide (`window.innerWidth`, which shrinks with browser zoom, as intended). Otherwise the Syntax Rush button on the menu, and Play Again on the Syntax Rush Game Over screen, are shown with `aria-disabled="true"`, ignore clicks, and point (`aria-describedby`) to the note "Syntax Rush needs a keyboard. Try it on a computer." The check updates live on resize and on media query change. A run already in progress is never stopped by the gate (its timing does not depend on window size, see AC-7).
- **AC-3**: Classic Runner is unchanged. Not edited: `GameCanvas.tsx`, `Hud.tsx`, `GameOverScreen.tsx`, `ScreenFrame.tsx`, `components/Button.tsx`, `components/ScoreBadge.tsx`, `engine/physics.ts`, `engine/spawner.ts`, `engine/collision.ts`, `engine/score.ts`, `engine/terrain.ts`, `engine/viewport.ts`. Same storage key and best score. Existing tests pass with no line changed or deleted; new tests are additions only. Shared files only gain additions: `index.css` gains only `--color-danger`, `icons.tsx` only `HeartIcon`, `constants/game.ts` only an appended block; the one changed existing line is `startGame` also setting `mode: 'classic'`.

Obstacles and symbols
- **AC-4**: Obstacles are bug sprites walking in from the right edge along the ground, each with one character drawn in a tile above it. There are no platforms and no jumping in this mode.
- **AC-5**: Every obstacle shows one character, either a lowercase letter or a code symbol. There are two pools: letters (`a` to `z`, all 26) and code symbols. Two tiers decide the code symbols and the mix:
  - Tier 1, from the start of a run: code symbols `; = ( ) { }`; each spawn is a letter with chance `LETTER_CHANCE_TIER_1` (0.75), otherwise a code symbol.
  - Tier 2, once the run's full score (distance plus coins) reaches `SYNTAX_TIER_2_SCORE` (200): code symbols gain `[ ] < > : +` (12 in total); each spawn is a letter with chance `LETTER_CHANCE_TIER_2` (0.5).
  Quote keys (single quote, double quote, backtick) and any other dead key characters are never used.
- **AC-6**: Each new obstacle first rolls letter or code symbol by the tier's chance, then picks uniformly inside that pool, never the same character as the obstacle spawned just before it.
- **AC-7**: The play area is always `SYNTAX_VIEW_WIDTH` (1280) world px wide, on every screen: the canvas is drawn at `cssWidth / SYNTAX_VIEW_WIDTH`, ignoring height and ignoring Classic's `drawScale`. So difficulty is the same on every desktop. Scroll speed starts at `SYNTAX_BASE_SPEED`, grows by `SYNTAX_SPEED_INCREASE_RATE` per second, and stops at `SYNTAX_MAX_SPEED`. Spawn gaps are picked between `SYNTAX_SPAWN_INTERVAL_MIN` and `SYNTAX_SPAWN_INTERVAL_MAX`; the first spawn of a run waits one such gap. At top speed an obstacle is fully visible for at least `SYNTAX_MIN_VISIBLE_TIME` (1.0 s) before it touches the mascot (unit test; about 1.54 s with the values below).

Typing
- **AC-8**: Target lock: of the obstacles fully on screen (bug box `x + width <= SYNTAX_VIEW_WIDTH`), the one nearest the mascot (smallest `x`) is the target. A tile is drawn only once its bug is fully on screen. The target's character is gold, on a tile 1.2 times larger with an accent outline; every other character is muted on a normal tile. Color is never the only cue.
- **AC-9**: A typed key is matched by the character it produces (`event.key`), so Shift and AltGr layouts work. Letters match in either case (`K` matches `k`, compared with `toLowerCase()`), so Caps Lock or a held Shift never turns a correct letter into a wrong key; code symbols match exactly. On a non Latin layout (for example Cyrillic), a key whose `event.key` is not ASCII but whose `event.code` is `KeyA` to `KeyZ` counts as that Latin letter. A key that matches any fully visible obstacle destroys the nearest such obstacle (the target if it matches, otherwise the nearest one with that character). If two visible obstacles show the same character, the nearer one is destroyed. An obstacle already touching the mascot can still be destroyed by a key in the same moment (generous).
- **AC-10**: A destroyed obstacle disappears at once and a particle burst plays at its position in the accent color, built on the same fixed pool pattern as Classic Runner's landing dust, with room for 4 overlapping bursts.
- **AC-11**: A wrong key (a counted key that matches no visible obstacle) costs no life. It resets the combo to 0 and shows a red flash along the screen edges. The flash lasts `WRONG_FLASH_DURATION` (0.15 s) and cannot restart sooner than `WRONG_FLASH_MIN_GAP` (0.34 s) after the last one started, so mashing never flashes more than 3 times a second. The first wrong key of a run always flashes.
- **AC-12**: Key classes while running:
  - Ignored and left alone (not prevented, not counted): Escape (handled as pause, AC-14), keys whose `event.key` is not exactly one character (Shift, Tab, Enter, Backspace, arrows, `Dead`, `Process`, emoji), keys during IME composition (`isComposing`), keys with Meta, keys with Ctrl but without Alt (AltGr reports Ctrl and Alt together and still counts).
  - Blocked but not counted (prevented, no stats, no flash): Space, and repeats of any otherwise counted key.
  - Counted: every other single character key. If no obstacle is fully on screen it is prevented but not counted (no stats, no flash).
  - Not running (paused, menu, game over): no key is prevented or counted, so Space and Enter still press the focused Resume or menu buttons.
- **AC-13**: Every blocked or counted key calls `preventDefault()` while running, including in the gaps with no bug on screen, so keys like `/` or `'` never open browser quick find and Space never scrolls the page.
- **AC-14**: Esc pauses and resumes (repeats ignored). P does not pause in this mode. Losing window focus or hiding the tab pauses, as in Classic Runner. The pause button in the HUD gives focus back to the page after a click, as in Classic.
- **AC-15**: If a counted key arrives from a non Latin layout (AC-9), a hint "Switch to an English keyboard layout for code symbols" shows on the canvas for 3 s (at most once per run).

Combo, score, lives
- **AC-16**: The combo counts destroyed obstacles in a row. It resets to 0 on a wrong key and on a life lost; a harmless pop during grace leaves it unchanged. It is shown in the HUD (for example "x7") and has no effect on the score.
- **AC-17**: Score = `calculateScore(elapsedTime)` (the same distance score as Classic Runner, from world time) plus `COIN_VALUE` (10) for each destroyed obstacle. The store hears about the score only when the whole number changes.
- **AC-18**: A run starts with `SYNTAX_LIVES` (3) lives, shown as hearts in the HUD (`aria-label` "Lives: N"). When an obstacle touches the mascot outside the grace period, one life is lost, that obstacle is removed with a red burst, and the combo resets. If several touch in the same frame, only the first costs a life (the others fall inside the grace it starts).
- **AC-19**: Grace period: after a life is lost (and lives remain), for `GRACE_DURATION` (2.0 s of real time) the mascot cannot be hit and blinks (opacity 0.35 or 1, switching every 0.1 s). The whole world (scroll, spawn timer, speed ramp, distance score, particles) runs at `GRACE_SLOW_FACTOR` (0.5) of normal time, easing back to full speed over the last `GRACE_RECOVER` (0.5) s. An obstacle that reaches the mascot during grace pops in a red burst and costs nothing. Typing works normally during grace. Grace never stacks.
- **AC-20**: When the last life is lost, the run ends in that frame and the Syntax Rush Game Over screen appears.

Game Over and persistence
- **AC-21**: The Syntax Rush Game Over screen shows the final score, the Syntax Rush best, WPM, and accuracy. It keeps the Classic rules: no button is autofocused, and buttons ignore input for the first 400 ms. Play Again starts a new Syntax Rush run (subject to the gate, AC-2); Back to LiveCode returns to the menu.
- **AC-22**: WPM = round((correct keys / 5) / (active minutes)). Active time is real play time, pauses excluded, grace counted at real speed, the empty opening seconds included (accepted: it keeps the formula simple). Runs shorter than 1 s show 0. Accuracy = floor(100 × correct / (correct + wrong)), so 100% means no wrong key at all; shown as "–" when no counted key was pressed.
- **AC-23**: The Syntax Rush best score is stored separately under `livecode-game-bestscore-syntax`, read when the store is created, written only when beaten, through `src/lib/storage.ts` (never throws). A quit run does not count. WPM and accuracy are not stored.

Run lifecycle and engine
- **AC-24**: Pause keeps everything exactly as it was (obstacles, lives, combo, grace time, flash, stats, particles). Quit to Menu throws the run away. Play Again and starting from the menu begin a clean run. Resizing the window mid run keeps the mascot on the ground and changes nothing about timing.
- **AC-25**: Symbol picking, key classification and matching, target lookup, the speed curve, the view scale, the gate rule, the grace speed factor, the score, and the WPM and accuracy formulas are pure functions in `src/engine/syntaxRush.ts`, covered by Vitest tests with no canvas.

## Decision

**Chosen option**: Option 1: A separate Syntax Rush canvas and engine file, sharing the one store

Syntax Rush gets its own `SyntaxRushCanvas.tsx`, `SyntaxRushHud.tsx`, `SyntaxRushGameOver.tsx`, and pure `engine/syntaxRush.ts`; the existing store gains a `mode` plus a few Syntax Rush fields, and `App.tsx` picks which screens to mount by mode. Classic Runner files are not edited.

## Feature design

**Data model sketch** (in memory only, except the one new storage key):
- `GameMode` (new, `engine/types.ts`): `'classic' | 'syntax'`.
- `SymbolObstacle` (new, `engine/types.ts`): `Obstacle & { id: number; symbol: string }`. `id` is a run local counter so a resolved key can name which obstacle to remove. All fields required.
- `TypingStats` (new, `engine/types.ts`): `{ wpm: number; accuracy: number | null }`.
- `KeyInput` (new, `engine/types.ts`): `{ key: string; code: string; repeat: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean; isComposing: boolean }` (a plain copy of the `KeyboardEvent` fields, so the engine needs no DOM type).
- `KeyClass` (new): `{ kind: 'ignore' } | { kind: 'block' } | { kind: 'typed'; char: string; nonLatin: boolean }`.
- `Obstacle`, `Entity`, `Platform`: unchanged.
- Store (`store/gameStore.ts`) gains: `mode: GameMode` (default `'classic'`), `syntaxBestScore: number` (read once at creation), `lives: number`, `combo: number`, `lastStats: TypingStats | null`. `mode` is only read while `status` is `playing`, `paused` or `gameover`; `resetToMenu` stays as is and leaves these fields stale on purpose, the next start overwrites them.
- Loop state inside `SyntaxRushCanvas.tsx` (a closure, not React state): `obstacles: SymbolObstacle[]`, `nextId`, `lastSymbol: string | null`, `elapsedTime` (world s), `activeTime` (real s), `timeSinceLastSpawn`, `spawnInterval`, `lives`, `combo`, `destroyed`, `correctKeys`, `wrongKeys`, `graceLeft`, `flashLeft`, `sinceLastFlash`, `layoutHintLeft`, `layoutHintShown`, `groundScroll`, `cloudScroll`, a fixed particle pool with a round robin `nextBurst`, `publishedScore`, `running`, `lastTime`. The mascot has no state beyond its fixed box: `{ x: MASCOT_X, y: groundY - MASCOT_SIZE, width: MASCOT_SIZE, height: MASCOT_SIZE }`, rebuilt from the current `groundY` every frame.
- Storage: new key `livecode-game-bestscore-syntax`. The classic key `livecode-game-bestscore` is untouched.

**State transitions** (store `status`, unchanged values, now with `mode`):
- menu → playing: `startGame()` sets `status` and `mode: 'classic'`; `startSyntaxGame()` sets `status`, `mode: 'syntax'`, `score: 0`, `lives`, `combo: 0`, `lastStats: null`. Each is one `set` call, so no render ever sees `playing` with the old mode (which would mount the wrong canvas for a frame).
- playing ↔ paused (`pauseGame()` / `resumeGame()`, shared, unchanged)
- playing → gameover: `endGame(score)` for classic, unchanged; `endSyntaxGame(score, stats)` for syntax
- paused → menu, gameover → menu (`resetToMenu()`, unchanged); gameover → playing via Play Again of the matching mode

**Store actions** (the "API surface" of the UI side):

| Action | Inputs | Effect |
|---|---|---|
| `startGame()` | none | as today, plus `mode: 'classic'` in the same `set` |
| `startSyntaxGame()` | none | one `set`: `status: 'playing'`, `mode: 'syntax'`, `score: 0`, `lives: SYNTAX_LIVES`, `combo: 0`, `lastStats: null` |
| `setLives(n)` | number | `lives = n`, only if it changed |
| `setCombo(n)` | number | `combo = n`, only if it changed (so mashing wrong keys at combo 0 notifies nobody) |
| `endSyntaxGame(score, stats)` | number, `TypingStats` | `status: 'gameover'`, `score`, `lastStats = stats`; if `score > syntaxBestScore`, save it and update it. Never touches `bestScore` |

**App routing** (`App.tsx`): reads `mode` with its own selector. Inside the existing `inRun` wrapper it renders exactly one of `GameCanvas` + `Hud` (classic) or `SyntaxRushCanvas` + `SyntaxRushHud` (syntax). For `gameover` it renders exactly one of `GameOverScreen` or `SyntaxRushGameOver`. The menu is unchanged in structure.

**Engine functions** (all pure, in `engine/syntaxRush.ts`):

| Function | Inputs | Output | Notes |
|---|---|---|---|
| `codeSymbols(score)` | score | `readonly string[]` | tier 1 code symbols, plus tier 2 once `score >= SYNTAX_TIER_2_SCORE` |
| `letterChance(score)` | score | 0 to 1 | `LETTER_CHANCE_TIER_1` below `SYNTAX_TIER_2_SCORE`, else `LETTER_CHANCE_TIER_2` |
| `pickSymbol(score, previous, random)` | full score, last character or null, random | string | first `random() < letterChance(score)` picks the letters pool, else `codeSymbols(score)`; then a second `random()` picks uniformly in that pool minus `previous` |
| `classifyKey(input)` | `KeyInput` | `KeyClass` | AC-12 rules, in this order: Escape, `isComposing`, Meta, Ctrl without Alt, `key.length !== 1` → ignore; Space or `repeat` → block; else typed. `char` is `key`, except a non ASCII `key` with `code` matching `/^Key[A-Z]$/` gives that letter lowercased and `nonLatin: true`; any other non ASCII `key` keeps `key` with `nonLatin: true` |
| `matchesSymbol(char, symbol)` | typed character, obstacle character | boolean | letters compare with `toLowerCase()` (never `toLocaleLowerCase`), code symbols compare exactly |
| `syntaxSpeed(elapsedTime)` | world seconds | px/s | `min(SYNTAX_BASE_SPEED + SYNTAX_SPEED_INCREASE_RATE × t, SYNTAX_MAX_SPEED)` |
| `pickSyntaxSpawnInterval(random)` | random | seconds | in `[SYNTAX_SPAWN_INTERVAL_MIN, SYNTAX_SPAWN_INTERVAL_MAX)` |
| `syntaxViewScale(cssWidth)` | CSS px | number | `cssWidth / SYNTAX_VIEW_WIDTH` |
| `meetsSyntaxGate(fineHover, width)` | boolean, CSS px | boolean | `fineHover && width >= SYNTAX_MIN_WIDTH` |
| `spawnSymbolObstacle(id, groundY, symbol)` | | `SymbolObstacle` | bug sized box (`OBSTACLE_SIZES[1]`, 100 × 84), left edge at `SYNTAX_VIEW_WIDTH`, bottom on `groundY` |
| `advanceSymbolObstacles(obstacles, distance, groundY)` | | `SymbolObstacle[]` | shift left, pin to ground, keep `id` and `symbol`; keeps a `x + width > 0` filter as a safety net |
| `visibleObstacles(obstacles)` | | `SymbolObstacle[]` | those with `x + width <= SYNTAX_VIEW_WIDTH` |
| `findTarget(obstacles)` | | `SymbolObstacle \| null` | visible one with the smallest `x` |
| `resolveKey(char, obstacles)` | | `number \| null` | id of the nearest visible obstacle where `matchesSymbol(char, symbol)`, else null |
| `graceSpeedFactor(graceLeft)` | seconds left | 0.5 to 1 | 1 when `graceLeft <= 0`; `GRACE_SLOW_FACTOR` while `graceLeft > GRACE_RECOVER`; linear back to 1 over the last `GRACE_RECOVER` s; result clamped to `[GRACE_SLOW_FACTOR, 1]` |
| `typingStats(correct, wrong, activeSeconds)` | | `TypingStats` | formulas of AC-22 |
| `syntaxScore(elapsedTime, destroyed)` | | number | `calculateScore(elapsedTime) + destroyed × COIN_VALUE` |

Reused unchanged: `calculateScore` (`score.ts`), `checkCollision` (`collision.ts`, `SymbolObstacle` fits `Obstacle`), `OBSTACLE_SIZES`, `MASCOT_X`, `MASCOT_SIZE`, `SCALE` (`constants/game.ts`). Not used: `drawScale` (replaced by `syntaxViewScale`).

**Canvas setup** (`SyntaxRushCanvas.tsx`). It follows `GameCanvas.tsx` closely but imports nothing from it, because those helpers are private to that file. It copies, as accepted duplication: `readToken`, `MAX_DT` (0.05), `GROUND_SHARE`, `GROUND_MIN_HEIGHT`, `SKY_MIN_HEIGHT`, `TICK_SPACING`, `TICK_LENGTH`, `GROUND_EDGE_HEIGHT`, the `getGroundY` formula (on world height `cssHeight / viewScale`), the sky gradient, the ground band with edge strip and ticks, the cloud layer, and the mascot sprite drawing with its running bob. No decor shapes, no platforms, no squash or tilt. Assets: `start-mascot.webp`, `bug-obstacle.webp`, `cloud.webp`. The canvas element gets `aria-hidden="true"` (the HUD carries the readable state).

Lifecycle, copied from Classic: a store subscription where `playing` after anything but `paused` (or `menu`) calls `resetRun()`, `running = status === 'playing'`, and `lastTime = null` so the first frame after a start or resume advances zero time. `resetRun()` sets: no obstacles, `nextId = 0`, `lastSymbol = null`, all times and counters 0, `spawnInterval = pickSyntaxSpawnInterval()`, `lives = SYNTAX_LIVES`, `combo = 0`, `graceLeft = 0`, `flashLeft = 0`, `sinceLastFlash = Infinity`, layout hint off, all particles dead, `publishedScore = 0`. Blur and `visibilitychange` listeners pause, as in Classic. Reduced motion (`prefers-reduced-motion: reduce`, read once on mount, guarded) halves the flash's peak opacity.

Frame order in `update(dt)` (`dt` is real seconds, clamped to `MAX_DT`):
1. `factor = graceSpeedFactor(graceLeft)`, `worldDt = dt × factor`; `graceLeft = max(0, graceLeft - dt)`; `flashLeft = max(0, flashLeft - dt)`; `sinceLastFlash += dt`; `layoutHintLeft = max(0, layoutHintLeft - dt)`; `activeTime += dt`; `elapsedTime += worldDt`.
2. `groundY = getGroundY()`; rebuild the mascot box from it. `speed = syntaxSpeed(elapsedTime)`, `distance = speed × worldDt`; `obstacles = advanceSymbolObstacles(obstacles, distance, groundY)`; ground and clouds scroll by `distance`; particles move by their own velocity × `worldDt`, slow with drag, and also shift left by `distance` (they sit on the scrolling world).
3. `score = syntaxScore(elapsedTime, destroyed)`. Spawn: `timeSinceLastSpawn += worldDt`; when due, `symbol = pickSymbol(score, lastSymbol)`, push `spawnSymbolObstacle(nextId++, groundY, symbol)`, set `lastSymbol`, pick the next interval, reset the timer.
4. Hits, for each obstacle overlapping the mascot (`checkCollision`), in order: remove it with a red burst. If `graceLeft > 0`, nothing else (combo unchanged). Otherwise `lives -= 1`, `combo = 0`; if `lives === 0`, `running = false` and `endSyntaxGame(score, typingStats(correctKeys, wrongKeys, activeTime))`, return (no `setLives(0)` first, the HUD unmounts anyway); else `setLives(lives)`, `setCombo(0)`, `graceLeft = GRACE_DURATION`. Later overlaps in the same frame then see `graceLeft > 0`.
5. Publish the score if its whole number changed.

Key handling (window `keydown`, between frames; `destroyed` changes here, so the next frame's score includes it):
1. `event.key === 'Escape'`: if not a repeat, toggle pause; return.
2. If not running, return (nothing prevented).
3. `k = classifyKey(event)`. `ignore` → return. `block` → `preventDefault()`, return. `typed` → `preventDefault()`.
4. If `k.nonLatin` and the hint was not shown this run, show it for 3 s.
5. If `visibleObstacles(obstacles)` is empty, return (not counted).
6. `id = resolveKey(k.char, obstacles)`. A hit: remove it, accent burst, `destroyed++`, `correctKeys++`, `combo++`, `setCombo(combo)`. A miss: `wrongKeys++`, `combo = 0`, `setCombo(0)`; if `sinceLastFlash >= WRONG_FLASH_MIN_GAP`, `flashLeft = WRONG_FLASH_DURATION`, `sinceLastFlash = 0`.

**Drawing details** (world px; the canvas transform is `dpr × syntaxViewScale(cssWidth)`):
- Character tile: `SYMBOL_TILE_SIZE` square, corner radius `SYMBOL_TILE_RADIUS`, `SYMBOL_TILE_GAP` above the bug's top, centered on the bug, surface color fill. Text bold `SYMBOL_FONT_SIZE` px in `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`, centered. Target: tile scaled by `TARGET_TILE_SCALE` (1.2), accent outline `TARGET_OUTLINE_WIDTH`, gold text. Others: muted text, no outline. At the narrowest allowed window (view scale 0.8) the font is about 22 CSS px.
- Particle burst: pool of `BURST_POOL` (4) bursts × `BURST_PARTICLES` (6) particles, reused round robin. Each particle flies out on one of 6 evenly spaced directions at `BURST_SPEED`, slows with `BURST_DRAG`, lives `BURST_LIFE` (0.35 s), radius `BURST_RADIUS` growing a little while it fades from full opacity to 0. Accent for a destroy, danger red for a life lost or a grace pop.
- Wrong key flash: a band `FLASH_EDGE` wide along all four edges in `--color-danger`, opacity fading linearly from 0.5 (0.25 under reduced motion) to 0 over `WRONG_FLASH_DURATION`.
- Grace blink: while `graceLeft > 0`, the mascot is drawn at opacity `Math.floor(graceLeft / 0.1) % 2 === 0 ? 0.35 : 1`. It uses real time, so it freezes on pause.
- Layout hint: one line of muted text centered near the top of the sky while `layoutHintLeft > 0`.

**UI pieces**:
- `SyntaxRushHud.tsx`: score, Syntax Rush best, hearts (`HeartIcon`, wrapper `aria-label="Lives: N"`), combo ("x7", hidden at 0), and a pause button that blurs itself after a click, as Classic's does. Each value is its own tiny component with its own selector, as in `Hud.tsx`. Its own pause panel: Resume (autofocused) and Quit to Menu, with the line "Press Esc to resume" (no "or P").
- `SyntaxRushGameOver.tsx`: built on `ScreenFrame`, `Button`, `ScoreBadge` (unchanged); score, Syntax Rush best, WPM, accuracy ("–" when `null`, and the whole stats block shows "–" if `lastStats` is `null`); its own `INPUT_LOCK_MS = 400`; no autofocus; Play Again gated (AC-2).
- `MainMenu.tsx` additions, in DOM order after Play: a secondary "Syntax Rush" button (no autofocus, gated), a line "Syntax Rush best: N", and a hint "Type the key on each bug. Esc pauses." plus the gate note when it applies. "High Score" keeps meaning Classic.
- `useCanPlaySyntaxRush()` in `src/features/game/useCanPlaySyntaxRush.ts`: `useSyncExternalStore`, subscribed to `resize` and to the media query's `change`; returns `meetsSyntaxGate(fineHover, window.innerWidth)`; if `window.matchMedia` is not a function it treats `fineHover` as false.

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| Spawn | letter or code symbol, and which pool | `letterChance(score)`, `codeSymbols(score)`, with `score = syntaxScore(...)` (distance plus coins) |
| Spawn | previous character | `lastSymbol` in loop state, `null` at run start |
| Spawn | x, ground line | `SYNTAX_VIEW_WIDTH`; `getGroundY()` copied from Classic, on world height |
| Drawing scale | view scale | `syntaxViewScale(canvas.clientWidth)` |
| Target lock | "fully on screen" | `x + width <= SYNTAX_VIEW_WIDTH` |
| Colors | gold, muted, accent, surface, ground, red | `readToken` (copied) for `--color-gold`, `--color-muted`, `--color-accent`, `--color-surface`, `--color-canvas`, `--color-line`, and the new `--color-danger` (`#ef4444`) in `@theme` |
| Key match | typed character | `classifyKey(event)`: `event.key`, with `event.code` as the Latin fallback for letters |
| Key ignore or block | modifiers, repeat, composition | `event.ctrlKey`, `altKey`, `metaKey`, `repeat`, `isComposing` |
| Score | world time, destroyed count | `elapsedTime`, `destroyed` in loop state |
| Lives, combo (HUD) | numbers | store `lives`, `combo`, set from the loop and key handler only on change |
| Grace | time left, blink phase | `graceLeft` (real time) |
| Flash | time left, rate limit | `flashLeft`, `sinceLastFlash` (real time, start `Infinity`) |
| Reduced motion | flag | `matchMedia('(prefers-reduced-motion: reduce)')` read once on mount, guarded |
| WPM | correct keys, active minutes | `correctKeys`, `activeTime` (sum of clamped real `dt`, zero while paused) |
| Accuracy | correct, wrong | `correctKeys`, `wrongKeys` |
| Game Over stats | WPM, accuracy | store `lastStats`, set by `endSyntaxGame` |
| Syntax best | number | `getSyntaxBestScore()` at store creation; `setSyntaxBestScore()` when beaten |
| Desktop gate | pointer kind, width | `matchMedia('(hover: hover) and (pointer: fine)')` and `window.innerWidth`, through `useCanPlaySyntaxRush()` |

**New constants** (`constants/game.ts`, appended as one block `// --- Syntax Rush (spec 0002) ---`, placeholders to tune). The existing file has broken characters in some older comments; append ASCII only and keep the file's current encoding and line endings, so the diff shows only the new lines.
- `SYNTAX_VIEW_WIDTH = 1280` (world px)
- `SYNTAX_BASE_SPEED = 150 * SCALE`, `SYNTAX_SPEED_INCREASE_RATE = 3 * SCALE`, `SYNTAX_MAX_SPEED = 300 * SCALE` (top speed after 50 s)
- `SYNTAX_SPAWN_INTERVAL_MIN = 1.3`, `SYNTAX_SPAWN_INTERVAL_MAX = 2.4` (s)
- `SYNTAX_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')`
- `SYNTAX_SYMBOLS_TIER_1 = [';', '=', '(', ')', '{', '}']`, `SYNTAX_SYMBOLS_TIER_2 = ['[', ']', '<', '>', ':', '+']`, `SYNTAX_TIER_2_SCORE = 200`
- `LETTER_CHANCE_TIER_1 = 0.75`, `LETTER_CHANCE_TIER_2 = 0.5`
- `SYNTAX_LIVES = 3`, `COIN_VALUE = 10`
- `GRACE_DURATION = 2.0`, `GRACE_SLOW_FACTOR = 0.5`, `GRACE_RECOVER = 0.5` (s)
- `WRONG_FLASH_DURATION = 0.15`, `WRONG_FLASH_MIN_GAP = 0.34` (s)
- `SYNTAX_MIN_WIDTH = 1024` (CSS px), `SYNTAX_MIN_VISIBLE_TIME = 1.0` (s)

Drawing only constants live at the top of `SyntaxRushCanvas.tsx`, as Classic's do: `SYMBOL_TILE_SIZE = 22 * SCALE`, `SYMBOL_TILE_RADIUS = 5 * SCALE`, `SYMBOL_TILE_GAP = 6 * SCALE`, `SYMBOL_FONT_SIZE = 14 * SCALE`, `TARGET_TILE_SCALE = 1.2`, `TARGET_OUTLINE_WIDTH = 1.5 * SCALE`, `BURST_POOL = 4`, `BURST_PARTICLES = 6`, `BURST_SPEED = 160 * SCALE`, `BURST_DRAG = 6`, `BURST_LIFE = 0.35`, `BURST_RADIUS = 3 * SCALE`, `FLASH_EDGE = 8 * SCALE`, `LAYOUT_HINT_DURATION = 3`.

**Key invariants**:
- No file listed in AC-3 is edited.
- Visible time: `(SYNTAX_VIEW_WIDTH - MASCOT_X - MASCOT_SIZE - OBSTACLE_SIZES[1].width) / SYNTAX_MAX_SPEED >= SYNTAX_MIN_VISIBLE_TIME` (unit test; (1280 - 160 - 96 - 100) / 600 ≈ 1.54 s).
- Readability: `syntaxViewScale(SYNTAX_MIN_WIDTH) × SYMBOL_FONT_SIZE >= 20` CSS px (unit test with the font size passed in, or asserted in a comment if the constant stays private).
- Every character in the letters pool and both symbol tiers is a single ASCII character, none is a quote or backtick, and no two pools share a character (unit test).
- `pickSymbol` never returns `previous` (unit test over both pools and both tiers).
- A paused run never advances `activeTime`, `elapsedTime`, `graceLeft`, `flashLeft`, or particles (all change only inside `update`).

**Security model**: not applicable (local, offline game; no data leaves the device).

**Configuration required**: none.

**Critical test scenarios** (`engine/syntaxRush.test.ts` unless noted):
- Happy path: visible obstacles `[{x:500, ';'}, {x:800, 'k'}]`; `resolveKey('k')` returns the second id; `resolveKey(';')` the first. Verifies **AC-9**.
- Same character twice: two visible `;`; `resolveKey(';')` returns the nearer one. Verifies **AC-9**.
- Not yet visible: an obstacle with `x + width > SYNTAX_VIEW_WIDTH` is neither target nor resolvable. Verifies **AC-8**, **AC-9**.
- Target: `findTarget` returns the smallest visible `x`, null when none. Verifies **AC-8**.
- Key classes: `Shift`, `Enter`, `Dead`, `Process`, `isComposing`, `Ctrl+c`, `Meta+v`, `Escape` are ignore; `' '` and a repeated `k` are block; `{` with Ctrl and Alt (AltGr) is typed `{`; key `ф` with code `KeyA` is typed `a` with `nonLatin: true`; key `ж` with code `Semicolon` is typed `ж` with `nonLatin: true`. Verifies **AC-9**, **AC-12**, **AC-15**.
- Case: `matchesSymbol('K', 'k')` and `matchesSymbol('k', 'k')` are true; `matchesSymbol('k', ';')` is false. Verifies **AC-9**.
- Symbols: `codeSymbols(199)` has 6, `codeSymbols(200)` has 12; `letterChance` is 0.75 at 199 and 0.5 at 200; with a random returning 0.1 then 0, `pickSymbol(0, null)` returns `a`, and with `previous = 'a'` returns `b`; with 0.9 then 0 it returns `;`, and with `previous = ';'` returns `=`. Verifies **AC-5**, **AC-6**.
- Speed, view and fairness: `syntaxSpeed` at 0 s, 25 s, 1000 s; `syntaxViewScale(1280) === 1`; visible time invariant. Verifies **AC-7**.
- Gate: `meetsSyntaxGate(true, 1024)` true; `(true, 1023)` and `(false, 1920)` false. Verifies **AC-2**.
- Grace: factor 1 at 0 and at -1, 0.5 at 1.8, 0.75 at 0.25, 0.5 at exactly 0.5. Verifies **AC-19**.
- Stats: `typingStats(50, 0, 60)` gives `{ wpm: 10, accuracy: 100 }`; `typingStats(9, 1, 60)` gives `{ wpm: 2, accuracy: 90 }`; `typingStats(995, 5, 600)` gives accuracy 99; `typingStats(0, 0, 30)` gives `{ wpm: 0, accuracy: null }`; `typingStats(3, 0, 0.5)` gives wpm 0. Verifies **AC-22**.
- Score: `syntaxScore(10, 3)` is 130. Verifies **AC-17**.
- Store (`gameStore.test.ts`, added tests only): `startSyntaxGame` sets mode, status and 3 lives in one update; `endSyntaxGame` saves only a higher syntax best and never changes `bestScore`; `startGame` after a syntax run sets `mode` back to `'classic'`; `setCombo(0)` at combo 0 does not notify subscribers. Verifies **AC-3**, **AC-21**, **AC-23**.
- Storage (`storage.test.ts`, added tests only): syntax best reads 0 when missing or corrupted, and the classic key is untouched by syntax writes. Verifies **AC-23**.
- Manual: mash wrong keys, flash rate stays at or below 3 per second; press `/` before the first bug appears in Firefox, quick find does not open; switch to a Russian layout, letters still work and the hint appears. Verifies **AC-11**, **AC-13**, **AC-15**.

## Build plan

No build approach is recorded for this project, so this follows thin end to end slices: something typeable on screen first, then lives and grace, then the end of run screens.

1. Add `GameMode`, `SymbolObstacle`, `TypingStats`, `KeyInput`, `KeyClass` to `engine/types.ts` and the constants block to `constants/game.ts` (ASCII only, encoding kept), satisfies **AC-5**, **AC-7**.
2. Write `engine/syntaxRush.ts` with `syntaxRush.test.ts`: pools and picking, key classify and match, view scale, gate, speed, spawn, advance, visibility, target, grace factor, stats, score, plus the invariant tests, satisfies **AC-2**, **AC-5** to **AC-9**, **AC-12**, **AC-15**, **AC-17**, **AC-19**, **AC-22**, **AC-25**.
3. Store and storage: new fields and actions (single `set` starts, change guarded setters); `getSyntaxBestScore` / `setSyntaxBestScore`; added tests only, satisfies **AC-3**, **AC-21**, **AC-23**.
4. Tracer slice: `SyntaxRushCanvas.tsx` with the copied scene, fixed view width, mascot on the ground, spawning bugs with tiles, target lock, the key handler (classify, prevent, resolve), score; `App.tsx` routes by mode; a plain Syntax Rush button on the menu, satisfies **AC-4**, **AC-7**, **AC-8**, **AC-9**, **AC-12**, **AC-13**, **AC-17**, **AC-24**.
5. Feedback: burst pool, edge flash with its rate limit and reduced motion, combo, layout hint, `--color-danger` token, satisfies **AC-10**, **AC-11**, **AC-15**, **AC-16**.
6. Lives and grace: hits, blink, world time scaling, last life ends the run, satisfies **AC-18**, **AC-19**, **AC-20**.
7. `SyntaxRushHud.tsx` with `HeartIcon`, combo, pause button and panel; Esc only pause, blur and hidden tab pause, satisfies **AC-14**, **AC-16**, **AC-18**, **AC-24**.
8. `SyntaxRushGameOver.tsx` and game over routing by mode, satisfies **AC-21**, **AC-22**.
9. Final menu: gated Syntax Rush button after Play, its best, hint and note, `useCanPlaySyntaxRush()`; gate Play Again too, satisfies **AC-1**, **AC-2**.
10. Check Classic Runner: full test suite with no edited lines, one Classic run on desktop and phone width, `git diff --stat` shows none of the AC-3 files, satisfies **AC-3**.
11. Play on a 1024 px window, a 1366 × 768 laptop and a wide monitor; tune speeds, spawn gaps, letter chances and grace if the feel is off, satisfies **AC-7**, **AC-19**.

## Consequences

**Positive**:
- Classic Runner is untouched, so the mode that already works on phones carries no risk from this feature.
- The whole typing mechanic reads from one file, `engine/syntaxRush.ts`.
- A fixed view width gives every desktop the same difficulty, so scores are comparable between a laptop and a big monitor.
- Students practise letters first, then the exact symbols beginners hunt for, in a game that still feels like the same world.

**Negative / tradeoffs**:
- Some code is repeated: the scene drawing, ground formula, `readToken`, `MAX_DT`, and the particle pool pattern are copied from `GameCanvas.tsx`. Changing the scenery later means changing two files.
- WPM will read low (about 10 to 30) because the game sets the pace, not the player. It measures the run, not the player's top typing speed.
- On a non Latin layout, letters work but some code symbols are on other keys or unreachable; the hint tells the player, but the mode is best on an English layout.
- The store grows by five fields that only Syntax Rush uses.
- Phone and tablet players see a mode they cannot play.

**Neutral**:
- No new dependency.
- Both canvases are imported eagerly, so Classic's sprite loads also run in Syntax Rush (harmless). The three Syntax Rush components could later be lazy loaded with `React.lazy`.

## Follow-up

- [ ] Once both modes are stable, extract the shared scenery, ground formula, `readToken` and particle pool from `GameCanvas.tsx` into a shared drawing module (a separate, behavior preserving change to Classic Runner, needs its own approval).
- [ ] v2: coins with a power up effect (explicitly deferred).
- [ ] Consider a tier 3 with more code symbols (`/ * ! & -`) after playtesting. Quote keys stay out: they are dead keys on US International and many European layouts.
- [ ] Consider storing a best WPM next to the best score.
- [ ] Consider an on screen symbol keyboard if mobile support is ever wanted for this mode.
- [ ] Consider `React.lazy` for the Syntax Rush components.
- [ ] Update `AGENTS.md` (via `/sync`) with the mode switch, the new store fields, the Esc only pause rule, and the fixed view width in Syntax Rush.

## Rationale

See [rationale.md](rationale.md) for the context, the options considered, and the reasoning behind each recommendation.
