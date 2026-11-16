// Placeholder values — all of these will be tuned once real gameplay exists.
// Units: pixels and seconds (px/s, px/s²), so the game loop can scale by delta time.

/** Downward acceleration applied to the mascot, in px/s². */
export const GRAVITY = 2400

/** Initial upward velocity of a jump, in px/s. */
export const JUMP_FORCE = 800

/** Ground scroll speed at the start of a run, in px/s. */
export const BASE_SPEED = 300

/** How much the scroll speed grows per second survived, in px/s². */
export const SPEED_INCREASE_RATE = 5

/**
 * The fastest the scroll can ever get, in px/s. With the rate above, a run
 * reaches it after (550 - 300) / 5 = 50 seconds and stays there.
 * Chosen so that on a narrow phone (about 360px wide) an obstacle is still
 * visible for roughly 0.4s before it reaches the mascot.
 */
export const MAX_SPEED = 550

/** Points earned per second survived. A one minute run scores 600. */
export const SCORE_RATE = 10

/** Shortest gap between obstacle spawns, in seconds. */
export const SPAWN_INTERVAL_MIN = 0.9

/** Longest gap between obstacle spawns, in seconds. */
export const SPAWN_INTERVAL_MAX = 2.2

/**
 * Placeholder obstacle sizes, in px. Each stands in for a shape from the design
 * until real sprites exist. All are sized so one jump clears them with room to spare.
 */
export const OBSTACLE_SIZES = [
  { width: 20, height: 36 }, // small and thin, stands in for the semicolon
  { width: 24, height: 64 }, // tall and thin, stands in for the brace
  { width: 52, height: 32 }, // low and wide, stands in for the bug
] as const

// --- Raised platforms (spec 0001) ---
// Fairness rules, both checked by tests in spawner.test.ts:
// the rise is at most half the jump peak, and the narrowest platform is longer
// than one full jump at MAX_SPEED (so jumping early still lands on top).

/** Score a run must reach before any platform can spawn (about 15 s). */
export const PLATFORM_MIN_SCORE = 150

/** Chance that a spawn is a platform instead of an obstacle, once past the score gate. */
export const PLATFORM_CHANCE = 0.15

/** How high a platform's top sits above the base ground, in px. */
export const PLATFORM_RISE = 48

/** Narrowest platform, in px. */
export const PLATFORM_WIDTH_MIN = 400

/** Widest platform, in px. */
export const PLATFORM_WIDTH_MAX = 720

/**
 * How far below a platform's top the mascot's feet can be and still step up
 * onto it, in px. Deeper than this, touching the platform's side ends the run.
 */
export const STEP_TOLERANCE = 6
