import {
  OBSTACLE_SIZES,
  PLATFORM_CHANCE,
  PLATFORM_MIN_SCORE,
  PLATFORM_RISE,
  PLATFORM_WIDTH_MAX,
  PLATFORM_WIDTH_MIN,
  SPAWN_INTERVAL_MAX,
  SPAWN_INTERVAL_MIN,
} from '../constants/game'
import type { Obstacle, Platform } from './types'

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

// --- Raised platforms (spec 0001) ---
// When a spawn is due, the game loop first asks pickSpawnKind whether it should
// be a platform or a normal obstacle. A platform also lengthens the wait before
// the next spawn, so nothing ever spawns on top of it.

/**
 * Decides what the next spawn is. A platform only once the run's score has
 * reached PLATFORM_MIN_SCORE, never twice in a row, and then only with
 * PLATFORM_CHANCE.
 */
export function pickSpawnKind(
  score: number,
  lastWasPlatform: boolean,
  random: () => number = Math.random,
): 'obstacle' | 'platform' {
  if (score < PLATFORM_MIN_SCORE || lastWasPlatform) return 'obstacle'
  return random() < PLATFORM_CHANCE ? 'platform' : 'obstacle'
}

/** A new platform whose left edge starts at `spawnX`, with a random width. */
export function spawnPlatform(spawnX: number, random: () => number = Math.random): Platform {
  const width = PLATFORM_WIDTH_MIN + random() * (PLATFORM_WIDTH_MAX - PLATFORM_WIDTH_MIN)
  return { x: spawnX, width, rise: PLATFORM_RISE }
}

/** Scrolls every platform left by `distance` px and drops the ones fully off screen. */
export function advancePlatforms(platforms: readonly Platform[], distance: number): Platform[] {
  return platforms
    .map((platform) => ({ ...platform, x: platform.x - distance }))
    .filter((platform) => platform.x + platform.width > 0)
}

/**
 * How long to wait after spawning `platform`, in seconds: the time it takes to
 * scroll its own width at `speed` (px/s), plus a normal spawn interval. The
 * scroll speed never goes down, so by then the platform has fully come in and
 * the next obstacle starts behind it, never on it.
 */
export function intervalAfterPlatform(
  platform: Platform,
  speed: number,
  random: () => number = Math.random,
): number {
  return platform.width / speed + pickSpawnInterval(random)
}
