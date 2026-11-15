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

/** Shortest gap between obstacle spawns, in seconds. */
export const SPAWN_INTERVAL_MIN = 0.9

/** Longest gap between obstacle spawns, in seconds. */
export const SPAWN_INTERVAL_MAX = 2.2
