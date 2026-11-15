export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover'

/** Anything positioned in the game world (mascot, obstacles). Plain data, no methods. */
export type Entity = {
  x: number
  y: number
  /** Vertical velocity in px/s (positive = moving down). */
  vy: number
  width: number
  height: number
}
