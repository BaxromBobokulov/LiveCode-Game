export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover'

/** Anything positioned in the game world (mascot, obstacles). Plain data, no methods. */
export type Entity = {
  x: number
  /** Top edge, in px. Screen coordinates: y grows downward. */
  y: number
  /** Vertical velocity in px/s (positive = moving down). */
  vy: number
  width: number
  height: number
  /** True while standing on the ground. Set by applyVelocity, read by jump. */
  onGround: boolean
}

/**
 * A raised, flat section of ground the mascot can jump onto and run along.
 * Stored as a height above the base ground line (not an absolute y), so it
 * stays correct when the canvas resizes and the ground line moves.
 */
export type Platform = {
  /** Left edge, in px. */
  x: number
  width: number
  /** How far the platform's top sits above the base ground, in px (positive is up). */
  rise: number
}

/** A ground obstacle the mascot must jump over. A plain axis-aligned box. */
export type Obstacle = {
  /** Left edge, in px. */
  x: number
  /** Top edge, in px. */
  y: number
  width: number
  height: number
}

// --- Syntax Rush (spec 0002) ---

/** Which game mode a run belongs to. */
export type GameMode = 'classic' | 'syntax'

/** A Syntax Rush obstacle: a bug box carrying one character to type. */
export type SymbolObstacle = Obstacle & {
  /** Counter unique within a run, so a resolved key can name which bug to remove. */
  id: number
  /**
   * What is shown above the bug: one character (a lowercase letter or a code
   * symbol), or a whole word of 2 to 8 lowercase letters (spec 0003).
   */
  symbol: string
  /** Letters of a word already typed. Always 0 for a single character and for a word nobody has started. */
  typed: number
}

/** What a typed character did to the obstacles (spec 0003, AC-8). Each obstacle list is a new array. */
export type TypeResult =
  | { kind: 'miss' }
  | { kind: 'progress'; obstacles: SymbolObstacle[] }
  | { kind: 'destroyed'; obstacle: SymbolObstacle; obstacles: SymbolObstacle[] }

/** The typing results shown on the Syntax Rush Game Over screen. */
export type TypingStats = {
  wpm: number
  /** Whole percent, or null when no counted key was pressed. */
  accuracy: number | null
}

/** The KeyboardEvent fields the engine needs, copied out so it needs no DOM type. */
export type KeyInput = {
  key: string
  code: string
  repeat: boolean
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
  isComposing: boolean
}

/**
 * What a key press means in Syntax Rush:
 * ignore (left alone), block (prevented but not counted), or typed (a character to match).
 */
export type KeyClass =
  | { kind: 'ignore' }
  | { kind: 'block' }
  | { kind: 'typed'; char: string; nonLatin: boolean }
