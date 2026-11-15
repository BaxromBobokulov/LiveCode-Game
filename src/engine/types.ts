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
