// Placeholder values Р Р†Р вЂљРІР‚Сњ all of these will be tuned once real gameplay exists.
// Units: pixels and seconds (px/s, px/sР вЂ™Р вЂ ), so the game loop can scale by delta time.

/**
 * How big the game world is drawn, as a multiple of the original tuning.
 * Every value measured in px (sizes, distances, px/s, px/sР вЂ™Р вЂ ) is a base value
 * times SCALE; values measured only in seconds are not. Because jump time,
 * spawn timing and scoring depend on seconds only, changing SCALE makes the
 * world bigger on screen without changing how the game plays (relative to the
 * mascot's size). The fairness tests in spawner.test.ts and terrain.test.ts
 * run against the scaled values.
 */
export const SCALE = 2

/** The mascot's hitbox, a square, in px. */
export const MASCOT_SIZE = 48 * SCALE

/** The mascot's fixed distance from the left edge of the play area, in px. */
export const MASCOT_X = 80 * SCALE

// --- Screen size vs SCALE (see engine/viewport.ts) ---
// The world above is always SCALE times the base tuning. A small screen draws
// it shrunk back to base size, so a phone shows as much of the track ahead as
// it did before SCALE existed.

/**
 * The phone width the original reaction time was tuned on, in CSS px. At base
 * size and MAX_SPEED, an obstacle there is visible for
 * (390 - 80 - 48) / 550 РІвЂ°в‚¬ 0.48 s before it reaches the mascot.
 */
export const REFERENCE_PHONE_WIDTH = 390

/**
 * Narrowest screen, in CSS px, drawn at full SCALE. Drawing SCALE times bigger
 * shows SCALE times less of the track, so the screen must be SCALE times wider
 * than the reference phone to keep that same 0.48 s (2 Р“вЂ” 390 = 780).
 */
export const FULL_SCALE_MIN_WIDTH = REFERENCE_PHONE_WIDTH * SCALE

/**
 * Shortest screen, in CSS px, drawn at full SCALE. A jump from a platform
 * reaches (48 rise + 48 mascot + 133 peak) Р“вЂ” 2 РІвЂ°в‚¬ 459 px above the ground; with
 * the ground band (128) and the score bar (about 80) that needs about 667 px.
 */
export const FULL_SCALE_MIN_HEIGHT = 680

/** Downward acceleration applied to the mascot, in px/sР вЂ™Р вЂ . */
export const GRAVITY = 2400 * SCALE

/** Initial upward velocity of a jump, in px/s. */
export const JUMP_FORCE = 800 * SCALE

/** Ground scroll speed at the start of a run, in px/s. */
export const BASE_SPEED = 300 * SCALE

/** How much the scroll speed grows per second survived, in px/sР вЂ™Р вЂ . */
export const SPEED_INCREASE_RATE = 5 * SCALE

/**
 * The fastest the scroll can ever get, in px/s. With the rate above, a run
 * reaches it after (550 - 300) / 5 = 50 seconds (SCALE cancels out) and stays there.
 * Chosen (at SCALE 1) so that on a narrow phone (about 360px wide) an obstacle is still
 * visible for roughly 0.4s before it reaches the mascot.
 */
export const MAX_SPEED = 550 * SCALE

/** Points earned per second survived. A one minute run scores 600. */
export const SCORE_RATE = 10

/** Shortest gap between obstacle spawns, in seconds. */
export const SPAWN_INTERVAL_MIN = 0.9

/** Longest gap between obstacle spawns, in seconds. */
export const SPAWN_INTERVAL_MAX = 2.2

/**
 * Obstacle hitbox sizes, in px. Each box has the same shape as its sprite, so
 * the picture fills it and there is no invisible part that still kills. All
 * are sized so one jump clears them with room to spare, even at MAX_SPEED
 * (checked in spawner.test.ts). Only sizes with a sprite belong here.
 */
export const OBSTACLE_SIZES = [
  { width: 36 * SCALE, height: 33 * SCALE }, // the brace tile (78 × 72 image, about 1.08 wide per 1 tall)
  { width: 50 * SCALE, height: 42 * SCALE }, // the bug (240 × 204 image, about 1.18 wide per 1 tall)
] as const

/**
 * Drawing only: a box at least this wide per 1 tall is drawn as the bug,
 * a narrower one as the brace. Halfway between the brace box (36 / 33 ≈ 1.09)
 * and the bug box (50 / 42 ≈ 1.19). The two shapes are close, so a test in
 * spawner.test.ts checks every size still lands on the right side of it.
 */
export const BUG_MIN_RATIO = 1.14

// --- Raised platforms (spec 0001) ---
// Fairness rules, both checked by tests in spawner.test.ts:
// the rise is at most half the jump peak, and the narrowest platform is longer
// than one full jump at MAX_SPEED (so jumping early still lands on top).

/** Score a run must reach before any platform can spawn (about 15 s). */
export const PLATFORM_MIN_SCORE = 150

/** Chance that a spawn is a platform instead of an obstacle, once past the score gate. */
export const PLATFORM_CHANCE = 0.15

/** How high a platform's top sits above the base ground, in px. */
export const PLATFORM_RISE = 48 * SCALE

/** Narrowest platform, in px. */
export const PLATFORM_WIDTH_MIN = 400 * SCALE

/** Widest platform, in px. */
export const PLATFORM_WIDTH_MAX = 720 * SCALE

/**
 * How far below a platform's top the mascot's feet can be and still step up
 * onto it, in px. Deeper than this, touching the platform's side ends the run.
 */
export const STEP_TOLERANCE = 6 * SCALE
