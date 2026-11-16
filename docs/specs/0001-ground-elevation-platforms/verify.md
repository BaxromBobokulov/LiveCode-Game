# Verify: raised platforms · spec 0001 · updated 2026-11-16
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Tip: to reach platforms faster while checking by hand, you can temporarily set `PLATFORM_MIN_SCORE = 0` and `PLATFORM_CHANCE = 0.5` in `src/constants/game.ts` (put them back afterwards).

## UI / manual
- [ ] Start a run and play to score 149 → no platform ever appears → AC-1
- [ ] Keep playing past score 150 → now and then a raised slab scrolls in from the right edge, at the same speed as the ground ticks and obstacles → AC-1, AC-2
- [ ] Look at a platform → about 48 px above the ground, wide (about 400 to 720 px), drawn with the ground's dark fill and the blue edge strip, clearly ground and not a red obstacle → AC-2, AC-12
- [ ] Jump onto a platform → the mascot stops on its top, and you can jump again from there → AC-3
- [ ] Stay on a platform until it scrolls past → the mascot only drops once the platform's right edge passes its left edge, then lands on the base ground → AC-4
- [ ] Don't jump, run straight into a platform's side → the Game Over screen shows on that frame with the run's score → AC-5
- [ ] Jump a bit late so the mascot is just coming down at the platform's edge (feet a few px below the top) → it steps up instead of dying → AC-6
- [ ] Watch several platforms → never two platforms back to back; the next spawn after a platform is always a red obstacle, and it appears only after the platform has fully entered → AC-7, AC-8
- [ ] Watch obstacles near platforms → no obstacle ever sits on or overlaps a platform → AC-9
- [ ] With a platform on screen, pause (Esc), wait, resume → the platform is exactly where it was → AC-10
- [ ] With a platform on screen, Quit to Menu then Play again → no platforms at the start → AC-10
- [ ] Die with a platform on screen, Play Again → no platforms at the start → AC-10
- [ ] Standing on a platform, resize the window height by about 50 px (or rotate the phone emulator) → the mascot stays on top, no hit, no fall through → AC-11
- [ ] Repeat a few of the above in a narrow phone viewport (about 360 px wide) with tap to jump → platforms are still fair to jump onto at top speed → AC-2, AC-6

## Value sourcing checks
- [ ] Floor (platform top from `groundY - rise`): resize the window while on a platform → the top follows the ground line and the mascot follows the top → AC-11
- [ ] Floor ("was it above the top" from `prevBottom`): running into a side kills, falling onto the top lands; both cases at low and top speed → AC-3, AC-5
- [ ] Spawn kind (current score): platforms start right around score 150, not before → AC-1
- [ ] Spawn kind (last spawn was a platform): no back to back platforms over a long run → AC-7
- [ ] Platform width (random in the range): widths visibly vary between platforms → AC-2
- [ ] Wait after platform (current speed): late in a run (top speed) the next obstacle still never overlaps the platform → AC-8
- [ ] Platform colors (ground tokens via `readToken`): platform fill and strip match the ground exactly → AC-12

## Commands
- [ ] `npx vitest run` (from PowerShell) → all tests pass, including `src/engine/terrain.test.ts` and the platform blocks in `src/engine/spawner.test.ts` → AC-13
- [ ] `npx tsc -b --noEmit` → no errors in the platform files (`MainMenu.tsx` and `GameOverScreen.tsx` had an unused `MascotPlaceholder` import before this build) → AC-13

## Acceptance-criteria coverage
- AC-1 … score 149/150 steps, `pickSpawnKind` tests · AC-2 … look and width steps, `spawnPlatform` tests · AC-3 … landing step, terrain landing and fast fall tests · AC-4 … drop off step, terrain fall back test · AC-5 … side hit step, terrain wall tests · AC-6 … step up step, terrain step up tests · AC-7 … back to back step, `pickSpawnKind` test · AC-8 … wait step, `intervalAfterPlatform` tests · AC-9 … overlap step, `intervalAfterPlatform` behind test · AC-10 … pause, quit and replay steps · AC-11 … resize step · AC-12 … look step · AC-13 … commands
