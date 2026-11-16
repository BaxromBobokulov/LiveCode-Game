import { describe, expect, it } from 'vitest'
import {
  BASE_SPEED,
  BUG_MIN_RATIO,
  GRAVITY,
  JUMP_FORCE,
  MASCOT_SIZE,
  MAX_SPEED,
  OBSTACLE_SIZES,
  PLATFORM_CHANCE,
  PLATFORM_MIN_SCORE,
  PLATFORM_RISE,
  PLATFORM_WIDTH_MAX,
  PLATFORM_WIDTH_MIN,
  SCALE,
  SPAWN_INTERVAL_MAX,
  SPAWN_INTERVAL_MIN,
} from '../constants/game'
import {
  advanceObstacles,
  advancePlatforms,
  intervalAfterPlatform,
  pickSpawnInterval,
  pickSpawnKind,
  spawnObstacle,
  spawnPlatform,
} from './spawner'
import type { Obstacle, Platform } from './types'

const GROUND_Y = 500
const SPAWN_X = 800 * SCALE

/** A base (SCALE 1) length in px, at the game's current SCALE. */
const px = (base: number) => base * SCALE

/** A stand-in for Math.random that always returns the same value. */
const fixed = (value: number) => () => value

describe('pickSpawnInterval', () => {
  it('returns SPAWN_INTERVAL_MIN for the lowest random value', () => {
    expect(pickSpawnInterval(fixed(0))).toBe(SPAWN_INTERVAL_MIN)
  })

  it('stays below SPAWN_INTERVAL_MAX for the highest random value', () => {
    const interval = pickSpawnInterval(fixed(0.999999))

    expect(interval).toBeLessThan(SPAWN_INTERVAL_MAX)
    expect(interval).toBeCloseTo(SPAWN_INTERVAL_MAX, 4)
  })

  it('always lands inside the range with real randomness', () => {
    for (let i = 0; i < 200; i++) {
      const interval = pickSpawnInterval()
      expect(interval).toBeGreaterThanOrEqual(SPAWN_INTERVAL_MIN)
      expect(interval).toBeLessThan(SPAWN_INTERVAL_MAX)
    }
  })
})

describe('spawnObstacle', () => {
  it('returns null before the interval has passed', () => {
    expect(spawnObstacle(0.99, 1, SPAWN_X, GROUND_Y)).toBeNull()
  })

  it('spawns exactly when the interval is reached', () => {
    expect(spawnObstacle(1, 1, SPAWN_X, GROUND_Y)).not.toBeNull()
  })

  it('spawns when the interval was overshot', () => {
    expect(spawnObstacle(1.5, 1, SPAWN_X, GROUND_Y)).not.toBeNull()
  })

  it('starts the obstacle at spawnX, standing on the ground line', () => {
    const obstacle = spawnObstacle(1, 1, SPAWN_X, GROUND_Y)!

    expect(obstacle.x).toBe(SPAWN_X)
    expect(obstacle.y + obstacle.height).toBe(GROUND_Y)
  })

  it.each(OBSTACLE_SIZES.map((size, index) => [index, size] as const))(
    'picks size variant %i from the matching slice of the random range',
    (index, size) => {
      const random = fixed((index + 0.5) / OBSTACLE_SIZES.length)

      const obstacle = spawnObstacle(1, 1, SPAWN_X, GROUND_Y, random)!

      expect(obstacle.width).toBe(size.width)
      expect(obstacle.height).toBe(size.height)
    },
  )

  it('picks the last variant for the highest random value', () => {
    const last = OBSTACLE_SIZES[OBSTACLE_SIZES.length - 1]

    const obstacle = spawnObstacle(1, 1, SPAWN_X, GROUND_Y, fixed(0.999999))!

    expect(obstacle.width).toBe(last.width)
  })

  it('only ever produces one of the placeholder sizes with real randomness', () => {
    for (let i = 0; i < 200; i++) {
      const { width, height } = spawnObstacle(1, 1, SPAWN_X, GROUND_Y)!
      expect(OBSTACLE_SIZES).toContainEqual({ width, height })
    }
  })
})

describe('spawn timing (pickSpawnInterval + spawnObstacle together)', () => {
  /** Random values spread across the whole range, including both ends. */
  const samples = [0, 0.001, 0.25, 0.5, 0.75, 0.999, 0.999999]

  it.each(samples)(
    'never spawns before SPAWN_INTERVAL_MIN has elapsed (random = %f)',
    (value) => {
      const interval = pickSpawnInterval(fixed(value))

      expect(spawnObstacle(0, interval, SPAWN_X, GROUND_Y)).toBeNull()
      expect(spawnObstacle(SPAWN_INTERVAL_MIN / 2, interval, SPAWN_X, GROUND_Y)).toBeNull()
      expect(spawnObstacle(SPAWN_INTERVAL_MIN - 0.001, interval, SPAWN_X, GROUND_Y)).toBeNull()
    },
  )

  it.each(samples)(
    'always spawns once SPAWN_INTERVAL_MAX has elapsed (random = %f)',
    (value) => {
      const interval = pickSpawnInterval(fixed(value))

      expect(spawnObstacle(SPAWN_INTERVAL_MAX, interval, SPAWN_X, GROUND_Y)).not.toBeNull()
    },
  )

  it('spawns exactly at SPAWN_INTERVAL_MIN when the shortest interval was picked', () => {
    const interval = pickSpawnInterval(fixed(0))

    expect(spawnObstacle(SPAWN_INTERVAL_MIN, interval, SPAWN_X, GROUND_Y)).not.toBeNull()
  })

  it('does not spawn at SPAWN_INTERVAL_MIN when a longer interval was picked', () => {
    const interval = pickSpawnInterval(fixed(0.5))

    expect(spawnObstacle(SPAWN_INTERVAL_MIN, interval, SPAWN_X, GROUND_Y)).toBeNull()
  })

  it('does not spawn for a zero or negative elapsed time', () => {
    expect(spawnObstacle(0, SPAWN_INTERVAL_MIN, SPAWN_X, GROUND_Y)).toBeNull()
    expect(spawnObstacle(-1, SPAWN_INTERVAL_MIN, SPAWN_X, GROUND_Y)).toBeNull()
  })

  it.each([1 / 144, 1 / 60, 1 / 30, 0.05])(
    'keeps every gap between spawns inside the range when stepped the way the game loop does (dt = %f)',
    (dt) => {
      // Mirrors the loop in GameCanvas: add dt, try to spawn, reset on a spawn.
      let timeSinceLastSpawn = 0
      let interval = pickSpawnInterval()
      const gaps: number[] = []

      for (let step = 0; step < 20_000 && gaps.length < 200; step++) {
        timeSinceLastSpawn += dt
        if (spawnObstacle(timeSinceLastSpawn, interval, SPAWN_X, GROUND_Y)) {
          gaps.push(timeSinceLastSpawn)
          timeSinceLastSpawn = 0
          interval = pickSpawnInterval()
        }
      }

      expect(gaps.length).toBeGreaterThan(50)
      for (const gap of gaps) {
        expect(gap).toBeGreaterThanOrEqual(SPAWN_INTERVAL_MIN)
        // A spawn can land up to one step late, never more.
        expect(gap).toBeLessThan(SPAWN_INTERVAL_MAX + dt)
      }
    },
  )
})

describe('spawned obstacle shape', () => {
  it('has a positive width and height for every size variant', () => {
    for (const size of OBSTACLE_SIZES) {
      expect(size.width).toBeGreaterThan(0)
      expect(size.height).toBeGreaterThan(0)
    }
  })

  it.each([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.999999])(
    'matches one of the placeholder size variants for random = %f',
    (value) => {
      const { width, height } = spawnObstacle(1, 1, SPAWN_X, GROUND_Y, fixed(value))!

      expect(OBSTACLE_SIZES).toContainEqual({ width, height })
    },
  )

  it('produces every size variant over many random spawns', () => {
    const seen = new Set<string>()

    for (let i = 0; i < 500; i++) {
      const { width, height } = spawnObstacle(1, 1, SPAWN_X, GROUND_Y)!
      seen.add(`${width}x${height}`)
    }

    expect(seen.size).toBe(OBSTACLE_SIZES.length)
  })

  it.each([
    [320, 200],
    [1536, 666],
    [0, 0],
  ])('follows the given spawnX %i and groundY %i', (spawnX, groundY) => {
    const obstacle = spawnObstacle(1, 1, spawnX, groundY)!

    expect(obstacle.x).toBe(spawnX)
    expect(obstacle.y + obstacle.height).toBe(groundY)
  })

  it('returns a fresh object on each spawn', () => {
    const first = spawnObstacle(1, 1, SPAWN_X, GROUND_Y, fixed(0))
    const second = spawnObstacle(1, 1, SPAWN_X, GROUND_Y, fixed(0))

    expect(first).toEqual(second)
    expect(first).not.toBe(second)
  })
})

describe('advanceObstacles', () => {
  const [brace, bug] = OBSTACLE_SIZES
  const obstacle: Obstacle = { x: px(400), y: GROUND_Y - brace.height, ...brace }

  it('returns an empty list for an empty list', () => {
    expect(advanceObstacles([], px(15), GROUND_Y)).toEqual([])
  })

  it('keeps the order and the sizes of the obstacles', () => {
    const wide: Obstacle = { x: px(700), y: GROUND_Y - bug.height, ...bug }

    const next = advanceObstacles([obstacle, wide], px(15), GROUND_Y)

    expect(next.map((o) => [o.width, o.height])).toEqual([
      [px(36), px(33)],
      [px(50), px(42)],
    ])
  })

  it('removes an obstacle whose right edge lands exactly on the left edge of the screen', () => {
    const leaving = { ...obstacle, x: px(15) - obstacle.width } // right edge at px(15)

    expect(advanceObstacles([leaving], px(15), GROUND_Y)).toEqual([])
  })

  it('removes only the obstacles that left and keeps the rest', () => {
    const gone = { ...obstacle, x: px(1) - obstacle.width } // right edge at px(1)
    const staying = { ...obstacle, x: px(300) }

    const next = advanceObstacles([gone, staying], px(10), GROUND_Y)

    expect(next).toEqual([{ ...staying, x: px(290) }])
  })

  it('moves every obstacle left by the distance', () => {
    const next = advanceObstacles([obstacle, { ...obstacle, x: px(700) }], px(15), GROUND_Y)

    expect(next.map((o) => o.x)).toEqual([px(385), px(685)])
  })

  it('keeps an obstacle that is still partly on screen', () => {
    const leaving = { ...obstacle, x: px(15) - obstacle.width } // right edge at px(15)

    expect(advanceObstacles([leaving], px(10), GROUND_Y)).toHaveLength(1)
  })

  it('removes an obstacle once it is fully off the left edge', () => {
    const leaving = { ...obstacle, x: px(15) - obstacle.width } // right edge at px(15)

    expect(advanceObstacles([leaving], px(15), GROUND_Y)).toEqual([])
  })

  it('keeps obstacles standing on the ground when the ground line moves', () => {
    const [moved] = advanceObstacles([obstacle], 0, GROUND_Y + px(100))

    expect(moved.y + moved.height).toBe(GROUND_Y + px(100))
  })

  it('does not mutate the input list or its obstacles', () => {
    const list = [{ ...obstacle }]

    advanceObstacles(list, px(15), GROUND_Y)

    expect(list).toEqual([obstacle])
  })
})

describe('obstacle sizes are fair', () => {
  // Every size at both ends of the speed range. The slowest speed is the
  // tighter case: the obstacle stays under the mascot longest.
  const cases = OBSTACLE_SIZES.flatMap((size) =>
    [BASE_SPEED, MAX_SPEED].map((speed) => [size.width, size.height, speed] as const),
  )

  it.each(cases)('a %ix%i obstacle can be cleared by one jump of the mascot at %i px/s', (width, height, speed) => {
    // How long the mascot's feet stay above the obstacle's top during a jump.
    const peak = JUMP_FORCE ** 2 / (2 * GRAVITY)
    const timeAbove = 2 * Math.sqrt((2 * (peak - height)) / GRAVITY)
    // How long the obstacle spends under the mascot at this speed.
    const timeUnder = (MASCOT_SIZE + width) / speed

    expect(height).toBeLessThan(peak)
    // Ask for at least 0.1s of slack so the timing is forgiving.
    expect(timeAbove - timeUnder).toBeGreaterThan(0.1)
  })

  it('only has the two sprited sizes, brace and bug (no plain box)', () => {
    expect(OBSTACLE_SIZES).toHaveLength(2)
  })

  it('keeps every box close to its sprite shape, so no part of a hitbox is invisible', () => {
    // width / height of the image files (brace-obstacle.webp, bug-obstacle.webp).
    const spriteAspects = [78 / 72, 240 / 204]

    OBSTACLE_SIZES.forEach((size, index) => {
      const aspect = size.width / size.height
      // Drawn "contain" style: the share of the box the image covers.
      const covered = Math.min(aspect, spriteAspects[index]) / Math.max(aspect, spriteAspects[index])
      expect(covered).toBeGreaterThan(0.95)
    })
  })

  it('draws the brace box as the brace and the bug box as the bug (BUG_MIN_RATIO)', () => {
    const [brace, bug] = OBSTACLE_SIZES

    expect(brace.width / brace.height).toBeLessThan(BUG_MIN_RATIO)
    expect(bug.width / bug.height).toBeGreaterThanOrEqual(BUG_MIN_RATIO)
  })
})

describe('pickSpawnKind (AC-1, AC-7)', () => {
  it('never picks a platform before PLATFORM_MIN_SCORE', () => {
    expect(pickSpawnKind(PLATFORM_MIN_SCORE - 1, false, fixed(0))).toBe('obstacle')
    expect(pickSpawnKind(0, false, fixed(0))).toBe('obstacle')
  })

  it('can pick a platform once the score reaches PLATFORM_MIN_SCORE', () => {
    expect(pickSpawnKind(PLATFORM_MIN_SCORE, false, fixed(0))).toBe('platform')
  })

  it('never picks two platforms in a row', () => {
    expect(pickSpawnKind(PLATFORM_MIN_SCORE * 10, true, fixed(0))).toBe('obstacle')
  })

  it('picks a platform only below PLATFORM_CHANCE', () => {
    expect(pickSpawnKind(PLATFORM_MIN_SCORE, false, fixed(PLATFORM_CHANCE - 0.001))).toBe('platform')
    expect(pickSpawnKind(PLATFORM_MIN_SCORE, false, fixed(PLATFORM_CHANCE))).toBe('obstacle')
  })
})

describe('spawnPlatform (AC-2)', () => {
  it('starts at spawnX with the fixed rise', () => {
    const platform = spawnPlatform(SPAWN_X, fixed(0.5))

    expect(platform.x).toBe(SPAWN_X)
    expect(platform.rise).toBe(PLATFORM_RISE)
  })

  it('uses PLATFORM_WIDTH_MIN for the lowest random value', () => {
    expect(spawnPlatform(SPAWN_X, fixed(0)).width).toBe(PLATFORM_WIDTH_MIN)
  })

  it('always lands inside the width range with real randomness', () => {
    for (let i = 0; i < 200; i++) {
      const { width } = spawnPlatform(SPAWN_X)
      expect(width).toBeGreaterThanOrEqual(PLATFORM_WIDTH_MIN)
      expect(width).toBeLessThan(PLATFORM_WIDTH_MAX)
    }
  })
})

describe('advancePlatforms', () => {
  const platform: Platform = { x: px(400), width: px(500), rise: PLATFORM_RISE }

  it('moves every platform left by the distance', () => {
    expect(advancePlatforms([platform], px(15))).toEqual([{ ...platform, x: px(385) }])
  })

  it('keeps a platform that is still partly on screen', () => {
    expect(advancePlatforms([{ ...platform, x: px(-490) }], px(5))).toHaveLength(1)
  })

  it('removes a platform once it is fully off the left edge', () => {
    expect(advancePlatforms([{ ...platform, x: px(-490) }], px(10))).toEqual([])
  })

  it('does not mutate the input list or its platforms', () => {
    const list = [{ ...platform }]

    advancePlatforms(list, px(15))

    expect(list).toEqual([platform])
  })
})

describe('intervalAfterPlatform (AC-8, AC-9)', () => {
  const platform: Platform = { x: SPAWN_X, width: px(600), rise: PLATFORM_RISE }

  it.each([BASE_SPEED, px(420), MAX_SPEED])(
    'waits at least the time to scroll the platform width plus SPAWN_INTERVAL_MIN (speed %i)',
    (speed) => {
      expect(intervalAfterPlatform(platform, speed, fixed(0))).toBeCloseTo(
        platform.width / speed + SPAWN_INTERVAL_MIN,
        10,
      )
      expect(intervalAfterPlatform(platform, speed)).toBeGreaterThanOrEqual(
        platform.width / speed + SPAWN_INTERVAL_MIN,
      )
    },
  )

  it('leaves the next obstacle fully behind the platform', () => {
    // Simulate the wait at a constant speed: the platform scrolls left while
    // time passes, then an obstacle spawns at the right edge.
    const speed = MAX_SPEED
    const wait = intervalAfterPlatform(platform, speed, fixed(0))
    const [moved] = advancePlatforms([platform], speed * wait)

    expect(moved.x + moved.width).toBeLessThan(SPAWN_X)
  })
})

describe('platforms are fair', () => {
  const peak = JUMP_FORCE ** 2 / (2 * GRAVITY)
  const jumpDistanceAtMaxSpeed = ((2 * JUMP_FORCE) / GRAVITY) * MAX_SPEED

  it('PLATFORM_RISE is at most half the jump peak', () => {
    expect(PLATFORM_RISE).toBeLessThanOrEqual(0.5 * peak)
  })

  it('PLATFORM_WIDTH_MIN is at least one full jump at MAX_SPEED', () => {
    expect(PLATFORM_WIDTH_MIN).toBeGreaterThanOrEqual(jumpDistanceAtMaxSpeed)
  })
})
