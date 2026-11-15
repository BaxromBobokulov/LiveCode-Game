import { OBSTACLE_SIZES, SPAWN_INTERVAL_MAX, SPAWN_INTERVAL_MIN } from '../constants/game'
import type { Obstacle } from './types'

// Every function takes its randomness as a `random` argument (a function that
// returns a number from 0 up to, but not including, 1). It defaults to
// Math.random, and tests pass a fixed one so results are predictable.

/** Picks how long to wait before the next obstacle, in seconds. */
export function pickSpawnInterval(random: () => number = Math.random): number {
  return SPAWN_INTERVAL_MIN + random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN)
}

/**
 * Decides whether it is time for a new obstacle.
 * Returns the new obstacle once `timeSinceLastSpawn` reaches `interval`
 * (both in seconds), otherwise null.
 *
 * The obstacle gets one of the placeholder sizes at random. Its left edge
 * starts at `spawnX` (normally the right edge of the canvas) and its bottom
 * edge rests on the ground line `groundY`.
 */
export function spawnObstacle(
  timeSinceLastSpawn: number,
  interval: number,
  spawnX: number,
  groundY: number,
  random: () => number = Math.random,
): Obstacle | null {
  if (timeSinceLastSpawn < interval) return null

  const size = OBSTACLE_SIZES[Math.floor(random() * OBSTACLE_SIZES.length)]
  return { x: spawnX, y: groundY - size.height, width: size.width, height: size.height }
}

/**
 * Scrolls every obstacle left by `distance` px, keeps each one standing on the
 * ground line, and drops the ones that have fully left the screen.
 */
export function advanceObstacles(
  obstacles: readonly Obstacle[],
  distance: number,
  groundY: number,
): Obstacle[] {
  return obstacles
    .map((obstacle) => ({
      ...obstacle,
      x: obstacle.x - distance,
      y: groundY - obstacle.height,
    }))
    .filter((obstacle) => obstacle.x + obstacle.width > 0)
}
