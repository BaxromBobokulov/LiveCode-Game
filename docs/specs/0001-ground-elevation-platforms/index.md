# 0001. Raised platform sections as flat step segments

**Date**: 2026-11-16
**Status**: In Progress

## Summary

The ground stops being one flat line: now and then a raised block (a "platform") scrolls in, the mascot jumps up onto it, runs along it, and drops back down at its end. Running into the side of a platform ends the run, just like hitting an obstacle. Platforms are plain flat rectangles stored as a height above the normal ground, so the existing physics and collision code stay unchanged and only new, small pure functions are added. This spec covers step 1 only: empty platforms with nothing on top, so the jump up and drop down feel can be tuned on its own.

## Requirements

**User stories**:
- As a student on a break, I want the ground to sometimes step up and down so the run feels more varied than jumping the same kind of obstacle.
- As a student new to the game, I want the first part of a run to stay flat so I learn the basic jump before the ground changes.

**Acceptance criteria**:
- **AC-1**: Once the run's score reaches `PLATFORM_MIN_SCORE` (150, about 15 s), some spawns become a raised platform instead of an obstacle. Before that score, no platform ever spawns.
- **AC-2**: A platform is a flat rectangle `PLATFORM_RISE` (48 px) above the normal ground, with a random width between `PLATFORM_WIDTH_MIN` and `PLATFORM_WIDTH_MAX`. It enters at the right edge and scrolls left at the same speed as the ground and obstacles.
- **AC-3**: A mascot that jumps and comes down onto the top of a platform lands there: it stops on the platform's top, `onGround` becomes true, and it can jump again from there.
- **AC-4**: While any part of the mascot's width is over the platform and the mascot was on or above its top, the platform top is its floor. When the platform has scrolled fully past the mascot, the mascot falls back to the normal ground under ordinary gravity and lands there.
- **AC-5**: If the mascot touches the side or body of a platform more than `STEP_TOLERANCE` (6 px) below its top, the run ends exactly as it does on an obstacle hit (`endGame(score)`, same frame).
- **AC-6**: If the mascot's feet are within `STEP_TOLERANCE` below the platform top when it reaches the platform, it steps up onto the top instead of dying.
- **AC-7**: Two platforms never spawn back to back; the spawn after a platform is always a normal obstacle.
- **AC-8**: Nothing spawns while a platform is still coming past: the wait after a platform is the time the platform takes to scroll its own width at the current speed, plus a normal spawn interval. The next obstacle therefore never overlaps the platform.
- **AC-9**: No obstacle ever sits on or overlaps a platform (step 1 has empty platforms only).
- **AC-10**: Starting a new run, or going back to the menu, clears all platforms. Pausing and resuming keeps them exactly where they were.
- **AC-11**: Resizing the window during a run never causes a hit or a fall through a platform; the mascot keeps its height relative to the ground it stands on.
- **AC-12**: Platforms are drawn in the same style as the ground (same fill and edge strip colors, from the design tokens), so they read as raised ground, not as an obstacle.
- **AC-13**: The floor lookup, the wall boxes, and the spawn rules are pure engine functions, covered by Vitest unit tests that need no canvas.

## Decision

**Chosen option**: Option 1: Flat step segments

Raised ground is a list of plain `Platform` rectangles stored as a rise above the normal ground; a new pure file `engine/terrain.ts` answers "what is the floor under the mascot" and "which platform sides are hazards", and the spawner gains a platform kind next to obstacles.

## Feature design

**Data model sketch** (in memory only, no persistence):
- `Platform` (new, in `engine/types.ts`): `x: number` (left edge, px), `width: number` (px), `rise: number` (px above the base ground, positive is up). All required. Plain data, no methods.
- `Obstacle` and `Entity`: unchanged.
- Loop state in `GameCanvas.tsx` gains: `platforms: Platform[]`, `lastSpawnWasPlatform: boolean`, `prevBottom: number` (mascot bottom edge from the previous frame), `prevGroundY: number` (for the resize shift).

**Engine functions** (the "API surface" of this feature, all pure):

| Function | File | Inputs | Output | Notes |
|---|---|---|---|---|
| `platformTop(platform, groundY)` | `terrain.ts` | platform, base ground y | number | `groundY - platform.rise` |
| `floorY(mascot, prevBottom, platforms, groundY)` | `terrain.ts` | mascot entity, previous bottom edge, platforms, base ground y | number | Highest top among platforms that overlap the mascot horizontally and satisfy `prevBottom <= top + STEP_TOLERANCE`; otherwise `groundY` |
| `platformWalls(platforms, groundY)` | `terrain.ts` | platforms, base ground y | `Obstacle[]` | One box per platform: `{ x, y: top + STEP_TOLERANCE, width, height: rise - STEP_TOLERANCE }` |
| `pickSpawnKind(score, lastWasPlatform, random)` | `spawner.ts` | current score, flag, random | `'obstacle' \| 'platform'` | `'platform'` only if `score >= PLATFORM_MIN_SCORE`, `!lastWasPlatform`, and `random() < PLATFORM_CHANCE` |
| `spawnPlatform(spawnX, random)` | `spawner.ts` | right edge x, random | `Platform` | width from the range, `rise = PLATFORM_RISE` |
| `advancePlatforms(platforms, distance)` | `spawner.ts` | platforms, scroll distance | `Platform[]` | Shift left, drop ones fully off screen |
| `intervalAfterPlatform(platform, speed, random)` | `spawner.ts` | platform, current px/s, random | seconds | `platform.width / speed + pickSpawnInterval(random)` |

Frame order in `GameCanvas.tsx` `update(dt)`:
1. Read `groundY`. If it differs from `prevGroundY`, shift `mascot.y` and `prevBottom` by the difference (AC-11).
2. Advance platforms and obstacles by `distance`.
3. `floor = floorY(mascot, prevBottom, platforms, groundY)`, then `mascot = applyVelocity(applyGravity(mascot, dt), dt, floor)`.
4. Spawn: when `timeSinceLastSpawn >= spawnInterval`, roll `pickSpawnKind`. A platform: push `spawnPlatform`, set `spawnInterval = intervalAfterPlatform(...)`. An obstacle: the existing `spawnObstacle` path.
5. Collision: `checkAnyCollision(mascot, [...obstacles, ...platformWalls(platforms, groundY)])`.
6. Store `prevBottom = mascot.y + mascot.height` and `prevGroundY = groundY`.

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| Floor under mascot | platform top | `groundY` (from `GameCanvas`) minus `platform.rise` |
| Floor under mascot | "was it above the top" | `prevBottom`, kept in loop state from the last frame |
| Spawn kind | current score | `calculateScore(elapsedTime)`, already computed in the loop |
| Spawn kind | last spawn was a platform | `lastSpawnWasPlatform` in loop state |
| Platform width | width | `random` in `[PLATFORM_WIDTH_MIN, PLATFORM_WIDTH_MAX]` |
| Wait after platform | speed | `currentSpeed(elapsedTime)` from `engine/score.ts` |
| Platform drawing | colors | the existing ground colors read via `readToken` on mount |

**New constants** (`constants/game.ts`, all placeholders to tune):
- `PLATFORM_MIN_SCORE = 150`
- `PLATFORM_CHANCE = 0.15` (per spawn, after the gate)
- `PLATFORM_RISE = 48` (px)
- `PLATFORM_WIDTH_MIN = 400`, `PLATFORM_WIDTH_MAX = 720` (px)
- `STEP_TOLERANCE = 6` (px)

**Key invariants**:
- `PLATFORM_RISE` stays well below the jump peak (`JUMP_FORCE² / (2 × GRAVITY)`); a unit test asserts `PLATFORM_RISE <= 0.5 × peak` so tuning the jump cannot silently make platforms impossible.
- `PLATFORM_WIDTH_MIN` is at least one jump distance at `MAX_SPEED` (`2 × JUMP_FORCE / GRAVITY × MAX_SPEED`); asserted in a unit test.
- `physics.ts` and `collision.ts` are not modified.
- Platforms and obstacles never overlap (guaranteed by the wait after a platform, AC-8).

**Security model**: not applicable (local, offline game; no data leaves the device).

**Configuration required**: none (no env vars).

**Critical test scenarios**:
- Happy path: mascot above a platform falls onto it, lands on its top with `onGround` true, then once the platform passes it falls back to `groundY`. Verifies **AC-3**, **AC-4**.
- Wall hit: mascot on the ground runs into a platform's side; `floorY` returns `groundY` (no snap up) and the wall box overlaps the mascot. Verifies **AC-5**.
- Step up: mascot feet 4 px below the top reaches the platform; `floorY` returns the top and no wall overlap. Verifies **AC-6**.
- Fast fall: `prevBottom` above the top and new position below it in one frame still lands on top (no tunnelling). Verifies **AC-3**.
- Spawn gate: `pickSpawnKind` with score 149 and `random = () => 0` returns `'obstacle'`; with score 150 returns `'platform'`; with `lastWasPlatform = true` returns `'obstacle'`. Verifies **AC-1**, **AC-7**.
- Wait after platform: `intervalAfterPlatform` is at least `width / speed + SPAWN_INTERVAL_MIN`. Verifies **AC-8**, **AC-9**.
- Resize: changing `groundY` by 50 px while standing on a platform keeps the mascot on top with no hit (manual check in the browser). Verifies **AC-11**.

## Build plan

No build approach is recorded for this project, so this follows thin end to end slices: get something visible and playable first, then make it correct, then fair.

1. Add the `Platform` type to `engine/types.ts` and the new constants to `constants/game.ts`, satisfies **AC-2**.
2. Write `engine/terrain.ts` (`platformTop`, `floorY`, `platformWalls`) with `terrain.test.ts` covering landing, falling off, wall hit, step up tolerance, and fast fall, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-13**.
3. Add `pickSpawnKind`, `spawnPlatform`, `advancePlatforms`, `intervalAfterPlatform` to `engine/spawner.ts` (new exports only; existing functions untouched) with tests in `spawner.test.ts`, plus the two invariant tests on rise and width, satisfies **AC-1**, **AC-2**, **AC-7**, **AC-8**, **AC-9**, **AC-13**.
4. Wire it into `GameCanvas.tsx`: platforms in loop state, cleared in `resetRun`; the frame order above (floor lookup before `applyVelocity`, spawn roll, walls in the collision check), satisfies **AC-1** to **AC-10**.
5. Keep the mascot relative to the ground on resize (`prevGroundY` shift), satisfies **AC-11**.
6. Draw platforms as raised ground slabs with the edge strip, in the same colors as the ground, satisfies **AC-12**.
7. Play it in the browser on a desktop and a narrow phone viewport, and tune the five constants if the feel is off, satisfies **AC-2**, **AC-6**.

## Consequences

**Positive**:
- The game gets a second kind of challenge with no change to the physics or collision files that already work and are tested.
- The whole mechanic reads from one file, `engine/terrain.ts`.
- Rise and width are tied to the jump arc by tests, so later jump tuning cannot quietly make platforms unfair.

**Negative / tradeoffs**:
- Terrain can only be steps, never slopes; adding slopes later would mean replacing `floorY`.
- Walking off a ledge sets `onGround` false, so the player cannot jump during the short fall (about 0.2 s for 48 px). A jump pressed right at the edge is lost.
- The loop in `GameCanvas.tsx` grows by a few lines of state (`platforms`, `prevBottom`, `prevGroundY`, `lastSpawnWasPlatform`).
- A side wall death is a new way to lose, which some players may find harsh at first.

**Neutral**:
- `spawnObstacle` and `advanceObstacles` keep their current signatures; step 2 (obstacles on platforms) will need to change them.
- No new dependency.

## Follow-up

- [ ] Step 2 spec: one obstacle on top of a platform, limited to the two short placeholder sizes (the semicolon and the bug, not the 64 px brace), placed with room to land first. This will need `Obstacle` to carry a `rise` and `advanceObstacles` to pin obstacles to `groundY - rise - height`.
- [ ] Consider a short grace period after walking off a ledge ("coyote time": jump still allowed for about 0.1 s) if playtesting shows lost jumps at platform edges.
- [ ] Replace placeholder platform drawing with real art when the sprite polish phase happens.
