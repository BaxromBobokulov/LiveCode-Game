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

// --- Syntax Rush (spec 0002) ---
// A second, keyboard only mode: type the character shown on each bug to
// destroy it before it reaches the mascot. Classic Runner never reads these.
// Placeholders to tune; the fairness rule (visible time at top speed) is
// checked in syntaxRush.test.ts.

/**
 * How wide the Syntax Rush play area is, in world px, on every screen. The
 * canvas is scaled to fit this width (ignoring height), so every desktop gets
 * the same reaction time and scores stay comparable.
 */
export const SYNTAX_VIEW_WIDTH = 1280

/** Narrowest window, in CSS px, that may start Syntax Rush (keeps tiles readable). */
export const SYNTAX_MIN_WIDTH = 1024

/** Scroll speed at the start of a Syntax Rush run, in px/s. Slower than Classic: typing takes longer than jumping. */
export const SYNTAX_BASE_SPEED = 150 * SCALE

/**
 * How much the Syntax Rush scroll speed grows per second, in px/s per second.
 * Clearly noticeable, but gentler than the old 8: about 1.33 times the
 * starting speed after 10 s, and twice it after 30 s.
 */
export const SYNTAX_SPEED_INCREASE_RATE = 5 * SCALE

/**
 * The fastest Syntax Rush ever gets, in px/s. Reached after (360 - 150) / 5,
 * 42 s. A bug then still has (1280 - 160 - 96 - 100) / 720, about 1.28 s, on
 * screen before it reaches the mascot (the fairness limit for 1.0 s would be
 * 462 * SCALE).
 */
export const SYNTAX_MAX_SPEED = 360 * SCALE

/** Shortest gap between Syntax Rush spawns, in seconds. */
export const SYNTAX_SPAWN_INTERVAL_MIN = 0.9

/** Longest gap between Syntax Rush spawns, in seconds. A steady typing pace, no long empty stretches. */
export const SYNTAX_SPAWN_INTERVAL_MAX = 1.6

/** The shortest time a bug must be fully visible before it reaches the mascot at top speed, in seconds. */
export const SYNTAX_MIN_VISIBLE_TIME = 1.0

/** Letters a bug can carry, from the start of a run. Lowercase; typing matches either case. */
export const SYNTAX_LETTERS: readonly string[] = 'abcdefghijklmnopqrstuvwxyz'.split('')

/** Code symbols from the start of a run. No quotes or backtick: they are dead keys on many layouts. */
export const SYNTAX_SYMBOLS_TIER_1: readonly string[] = [';', '=', '(', ')', '{', '}']

/** Code symbols added once the run reaches SYNTAX_TIER_2_SCORE. */
export const SYNTAX_SYMBOLS_TIER_2: readonly string[] = ['[', ']', '<', '>', ':', '+']

/** Full score (distance plus coins) at which tier 2 starts. */
export const SYNTAX_TIER_2_SCORE = 200

/** Chance that a tier 1 spawn carries a letter (otherwise a code symbol). */
export const LETTER_CHANCE_TIER_1 = 0.75

/** Chance that a tier 2 spawn carries a letter (otherwise a code symbol). */
export const LETTER_CHANCE_TIER_2 = 0.5

/** Lives at the start of a Syntax Rush run. */
export const SYNTAX_LIVES = 3

/** Points added to the score for every bug destroyed. */
export const COIN_VALUE = 10

/** How long the grace period after a lost life lasts, in real seconds. */
export const GRACE_DURATION = 2.0

/** How fast the world runs during grace, as a share of normal time. */
export const GRACE_SLOW_FACTOR = 0.5

/** The last part of grace, in seconds, during which the world eases back to full speed. */
export const GRACE_RECOVER = 0.5

/** How long the red edge flash after a wrong key lasts, in seconds. */
export const WRONG_FLASH_DURATION = 0.15

/** Shortest time between two flash starts, in seconds, so mashing never flashes more than 3 times a second. */
export const WRONG_FLASH_MIN_GAP = 0.34

// --- Syntax Rush word obstacles (spec 0003) ---
// Some bugs carry a whole keyword, typed letter by letter. Letters only, so
// every layout that works for single letters works for words too.

/**
 * Words from the start of a run: short C and Python keywords, 2 to 6 letters.
 * All lowercase, since the game only takes lowercase letters (so Python's
 * True / False show up as true / false).
 */
export const SYNTAX_WORDS_TIER_1: readonly string[] = [
  // C
  'if',
  'for',
  'int',
  'float',
  'char',
  'else',
  'switch',
  'while',
  'void',
  // Python
  'def',
  'elif',
  'in',
  'not',
  'and',
  'or',
  'pass',
  'print',
  'len',
  'range',
  'input',
  // both
  'true',
  'false',
]

/** Words added once the run reaches SYNTAX_TIER_2_SCORE: longer C and Python keywords, 5 to 8 letters. */
export const SYNTAX_WORDS_TIER_2: readonly string[] = [
  // C
  'struct',
  'printf',
  'scanf',
  'sizeof',
  'include',
  // Python
  'lambda',
  'import',
  'global',
  'return',
  'continue',
  // general
  'array',
  'class',
  'break',
  'string',
  'boolean',
  'function',
  'livecode',
  'baxromdev'
]

/** Chance that a spawn below SYNTAX_TIER_2_SCORE is a word (otherwise a single character). */
export const WORD_CHANCE_TIER_1 = 0.35

/** Chance that a spawn from SYNTAX_TIER_2_SCORE on is a word. */
export const WORD_CHANCE_TIER_2 = 0.45

/** Words walk at this share of the single character speed, before their length cap. */
export const WORD_SPEED_FACTOR = 0.5

/**
 * Extra reading and typing time a word gets per letter, in seconds, on top of
 * SYNTAX_MIN_VISIBLE_TIME. A word's speed is capped so it is always fully
 * visible for at least that long: `function` gets 1.0 + 8 * 0.4 = 4.2 s.
 */
export const WORD_LETTER_TIME = 0.4

/** Extra gap after a word spawns, in seconds per letter, so a long word does not arrive in a crowd. */
export const WORD_SPAWN_GAP_PER_LETTER = 0.3

/** Width of one letter cell in a word tile, in px. The tile is drawn cell by cell, so this is exact. */
export const WORD_CHAR_WIDTH = 10 * SCALE

/** Space between the tile's edge and its first or last letter cell, in px. */
export const WORD_TILE_PADDING = 6 * SCALE
