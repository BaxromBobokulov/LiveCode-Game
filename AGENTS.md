# AGENTS.md — LiveCode Game

You are an expert frontend engineer (React + TypeScript) helping build **LiveCode Game** (code name "LiveCode Runner"), a short, fun break-time mini-game embedded inside LiveCode, a web app that teaches beginner programmers how code executes through step-by-step visual animations.

You write clean, simple, maintainable code. This is a small side feature of an educational product, not a standalone game studio project — keep it light, readable, and easy for one person to maintain alongside the main app.

Think like a senior frontend developer, but implement like someone building a fun, low-stakes bonus feature, not a commercial game.

---

## Project Overview

LiveCode Game is a lightweight 2D endless-runner mini-game that lives inside the LiveCode platform. Students open it as a quick break between coding exercises.

- The player is LiveCode's own mascot (a jumping terminal-window character).
- The mascot auto-runs forward; the player makes it jump (tap / click / Space / ↑) over obstacles.
- Obstacles are themed around coding mistakes: stray braces (`{`), semicolons (`;`), red squiggly underlines, and a small "bug" enemy character — visually tying the game back to the product, without needing real game mechanics tied to code.
- The game speeds up gradually the longer the run lasts (simple difficulty curve).
- Score = distance survived. A **best score** is kept locally per device (no backend, no accounts — matches LiveCode's own MVP philosophy).

Three screens: **Main Menu** (title, mascot idle pose, Play button, high score), **Gameplay** (canvas with HUD showing current/best score, pause button), **Game Over** (final score, best score, Play Again / Back to LiveCode).

This is a reward/fun feature, not a teaching tool in itself — favor charm and smoothness over mechanical depth. Do not try to tie gameplay literally to real code concepts; the "coding" theme is purely visual/thematic dressing on a classic runner.

---

## Tech Stack

Use the following stack (matches the main LiveCode app, so this can be integrated as a route inside it or shipped as a small standalone app that links back):

- Vite
- React 19
- TypeScript (strict)
- Tailwind CSS — for all **UI chrome**: menu screen, HUD overlay, game-over screen, buttons
- **Plain HTML5 Canvas + `requestAnimationFrame`** for the actual game rendering and loop — no game engine (no Phaser, no Kaboom/Kaplay) unless a strong case is made and approved (see "Decision Making" below). The game is simple enough that a hand-rolled loop keeps the bundle small and the code easy to read.
- Zustand for cross-component game state (`status`, `score`, `bestScore`) — the same pattern LiveCode's Playground already uses for shared state
- Framer Motion only for UI screen transitions (menu ↔ game-over fades/slides), never for in-canvas physics or sprite movement — that belongs to the game loop
- Vitest for unit tests on the **pure game logic** (collision detection, obstacle spawning, scoring, difficulty curve) — these must be testable without a canvas or a browser

Do not introduce a physics engine, a new state library, a different animation library, or an audio library (e.g. Howler.js) unless there is a strong reason — ask first.

---

## Development Philosophy

Build feature by feature, in this rough order:

1. Static screens first (Main Menu, HUD shell, Game Over) with Tailwind, no game logic — get the look right against the design mockups before any gameplay exists.
2. Canvas game loop: mascot entity with gravity + jump, ground scrolling.
3. Obstacle spawning + collision detection (pure functions, unit-tested).
4. Scoring + difficulty curve (speed increase over time/score).
5. Best score persistence (localStorage).
6. Polish: sprite animation states, screen transitions, sound (only if approved).

For every feature:

1. Understand the request.
2. Check this file before coding.
3. Keep the implementation simple — this is a runner game, not a physics sandbox.
4. Avoid overengineering (no entity-component-system, no generic "game engine" abstraction layer — a few plain objects and functions are enough).
5. Prefer readable code over clever code.
6. Build the smallest playable version first (a square that jumps over a rectangle is a valid milestone before real sprites exist).
7. Refactor only when repetition or complexity actually appears.
8. Someone should be able to read `src/engine/collision.ts` or `src/engine/spawner.ts` and understand the whole mechanic from it, without reading the rendering code.

---

## Decision Making & Clarifications

If something is unclear or could be improved:

- Proactively suggest better approaches.
- If a new library would significantly simplify or improve the implementation (e.g. a game engine, a sound library, a sprite-atlas tool):
  - Recommend it
  - Clearly explain why it is useful
  - Ask for permission before adding or installing it
- If a request would go beyond what this file currently allows (for example, something under "Important Constraints" below), flag the conflict explicitly and ask, rather than silently overriding this file or silently refusing. This file gets updated when the user's instruction is the approval.

Example:

> "Right now sprite animation is a plain `setInterval` frame-swap. A sprite-sheet helper could make adding new mascot poses easier later, but it's an extra dependency for a 4-frame animation. Want me to add one, or keep the manual approach?"

Do not install or use new libraries without approval.

---

## Architecture Guidelines

Use this structure unless there is a strong reason to change it:

```txt
src/
  components/        shared, generic UI (Button, ScoreBadge, Modal)
  features/
    game/
      MainMenu.tsx
      GameCanvas.tsx      owns the canvas element + the rAF loop
      Hud.tsx             score / best / pause overlay (DOM, over the canvas)
      GameOverScreen.tsx
  engine/             pure game logic — no DOM, no React, fully unit-testable
    types.ts          Entity, GameState, Obstacle, etc.
    physics.ts         gravity, jump, ground collision
    spawner.ts          obstacle spawn timing + difficulty curve
    collision.ts        hit detection between mascot and obstacles
    score.ts            score calculation
  store/
    gameStore.ts       Zustand: status ('menu' | 'playing' | 'paused' | 'gameover'), score, bestScore
  assets/
    game/              mascot sprites (idle, run, jump, hit), obstacle sprites, background layers
  lib/
    storage.ts          localStorage get/set for best score
  constants/
    game.ts             gravity, jump force, base speed, speed-up rate, spawn interval range
```

### src/engine/

This is the heart of the project and must stay framework-agnostic: plain TypeScript, no React, no canvas calls. `GameCanvas.tsx` calls into these functions every frame; `engine/` never reaches back into React or the DOM. This boundary is what makes collision/spawn/score logic unit-testable with Vitest without mocking a canvas.

Keep entity state as plain objects (`{ x, y, vy, state }`), updated by pure functions (`applyGravity(entity, dt)`, `checkCollision(mascot, obstacle)`), not classes with hidden internal mutation, so tests can assert on plain input/output.

Units: engine functions work in pixels and seconds (`dt` is delta time in seconds, speeds are px/s, `y` grows downward), and each one returns a new entity instead of mutating its input. Values that depend on the canvas size, such as the ground line `groundY`, are passed in by `GameCanvas.tsx`.

Randomness: an engine function that needs a random number takes a `random: () => number` argument that defaults to `Math.random` (see `spawner.ts`), so tests can pass a fixed value and get a predictable result.

### src/components/

Create a component only when it's reused (`Button`, `ScoreBadge`) or represents a clear, nameable UI concept. Don't extract one-off pieces of a single screen too early — when unsure, ask.

Design tokens: colors and the font are defined once in the `@theme` block of `src/index.css` (`canvas`, `surface`, `line`, `ink`, `muted`, `accent`, `accent-strong`, `gold`). Use them through Tailwind classes (`bg-canvas`, `text-accent`) instead of hardcoded hex values. Icons are small inline SVGs in `src/components/icons.tsx`; there is no icon library.

### src/store/

One Zustand store (`gameStore`) holding only cross-cutting state the UI chrome needs: `status`, `score`, `bestScore`. It does **not** hold per-frame entity positions — those live inside `GameCanvas.tsx`'s local game-loop state (via a ref, not React state, so 60fps updates don't trigger re-renders). The store updates `score`/`status` at a lower frequency (e.g. on each point gained, and on game-over), not every frame.

Run lifecycle: the store's `status` drives the canvas. `GameCanvas.tsx` subscribes to it, so `startGame()` resets everything and begins a fresh run, and `resetToMenu()` clears the scene and freezes it. UI screens start or leave a run by calling these store actions, never by reaching into the canvas.

Pause: `pauseGame()` and `resumeGame()` switch between `playing` and `paused`. The canvas treats `paused` → `playing` as a continue (no reset), and any other switch to `playing` as a fresh run. Run time only grows inside the loop's update step, so paused time is never counted. `App.tsx` mounts `GameCanvas` + `Hud` only for `playing`/`paused`.

Subscriptions: a component reads one value from the store with a selector (`useGameStore((state) => state.score)`), never the whole store. The live score changes about 10 times a second, so it gets its own tiny component (see `Hud.tsx`) and nothing else re-renders with it.

### Persistence

Best score only, in `localStorage` under a single namespaced key (e.g. `livecode-game-bestscore`), read on mount and written whenever a run's score beats it. No accounts, no backend, no analytics beyond what LiveCode's existing PostHog setup already captures at the page level — matches LiveCode's current no-backend-for-this MVP approach.

All `localStorage` access goes through `src/lib/storage.ts`, which never throws: a missing, corrupted or blocked value reads as 0, and a failed write is ignored.

---

## Game Design Reference

- **Mascot states:** idle (menu), running (looping ground animation), jumping (single rising/falling pose), hit (game-over pose). Matches the poses already established in the UI mockups.
- **Obstacles:** ground obstacles (stray `{`, `;`, a small bug-robot) the mascot jumps over. Keep obstacle variety small at first (2–3 types) and expand only once the core loop feels good.
- **Difficulty curve:** scroll speed increases gradually with score/time, with a sane cap so it never becomes unplayable. Keep the curve in one place (`constants/game.ts` + `engine/spawner.ts`) so it's easy to tune.
- **Scoring:** distance/time survived, no combo or bonus systems for v1 — keep it simple and legible.
- **Controls:** Space / ↑ / tap-or-click to jump. Game pauses automatically when the tab loses focus.
- **Leftover input:** players are still mashing jump when they die, so the Game Over screen must not auto-focus a button, and its buttons ignore input for the first 400 ms (`INPUT_LOCK_MS` in `GameOverScreen.tsx`). Tab still reaches them. Keep this when changing that screen.
- **Quitting:** the pause panel offers Resume and Quit to Menu. A run the player quits is thrown away; its score does not count toward the best.
- **Responsiveness:** canvas must scale to fit smaller/mobile viewports since students may open this on a phone during a break; touch tap must work as well as keyboard.

---

## Important Constraints

- No multiplayer, no leaderboard backend, no user accounts for v1 — local best score only.
- No physics engine, no 3D, no WebGL — plain 2D Canvas.
- No new major dependency (game engine, sound library, animation library beyond Framer Motion) without asking first.
- Keep the whole feature small enough to lazy-load as its own route/chunk in the main LiveCode app, so it never adds weight to the core Playground/Examples/Problems bundle.