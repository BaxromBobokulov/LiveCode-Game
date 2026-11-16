import { describe, expect, it } from 'vitest'
import {
  BASE_SPEED,
  GRAVITY,
  JUMP_FORCE,
  MASCOT_SIZE,
  MAX_SPEED,
  OBSTACLE_SIZES,
  SCORE_RATE,
  SPAWN_INTERVAL_MIN,
  SPEED_INCREASE_RATE,
} from '../constants/game'
import { calculateScore, currentSpeed } from './score'

/** Seconds until the speed reaches its cap. */
const TIME_TO_CAP = (MAX_SPEED - BASE_SPEED) / SPEED_INCREASE_RATE

describe('currentSpeed', () => {
  it('starts at BASE_SPEED', () => {
    expect(currentSpeed(0)).toBe(BASE_SPEED)
  })

  it('grows by SPEED_INCREASE_RATE for each second survived', () => {
    expect(currentSpeed(10)).toBe(BASE_SPEED + SPEED_INCREASE_RATE * 10)
  })

  it('reaches MAX_SPEED exactly when the ramp ends', () => {
    expect(currentSpeed(TIME_TO_CAP)).toBe(MAX_SPEED)
  })

  it.each([1, 60, 3600])('stays at MAX_SPEED %i seconds after the ramp ends', (extra) => {
    expect(currentSpeed(TIME_TO_CAP + extra)).toBe(MAX_SPEED)
  })

  it('never decreases as time passes', () => {
    let previous = currentSpeed(0)
    for (let t = 0.5; t <= TIME_TO_CAP + 10; t += 0.5) {
      const speed = currentSpeed(t)
      expect(speed).toBeGreaterThanOrEqual(previous)
      previous = speed
    }
  })
})

describe('calculateScore', () => {
  it('is 0 at the start of a run', () => {
    expect(calculateScore(0)).toBe(0)
  })

  it('gives SCORE_RATE points per second survived', () => {
    expect(calculateScore(1)).toBe(SCORE_RATE)
    expect(calculateScore(30)).toBe(SCORE_RATE * 30)
  })

  it('is always a whole number', () => {
    for (const t of [0.016, 0.333, 1.2345, 17.777, 99.999]) {
      expect(Number.isInteger(calculateScore(t))).toBe(true)
    }
  })

  it('rounds down, so a point only counts once it is fully earned', () => {
    expect(calculateScore(0.99 / SCORE_RATE)).toBe(0)
    expect(calculateScore(1.5 / SCORE_RATE)).toBe(1)
  })

  it('never decreases as time passes', () => {
    let previous = 0
    for (let t = 0; t <= 20; t += 1 / 60) {
      const score = calculateScore(t)
      expect(score).toBeGreaterThanOrEqual(previous)
      previous = score
    }
  })
})

describe('currentSpeed: linear ramp', () => {
  it.each([0.5, 1, 2.5, 7, 13.37, 25, TIME_TO_CAP / 2])(
    'is BASE_SPEED + SPEED_INCREASE_RATE * t at t = %f s',
    (t) => {
      expect(currentSpeed(t)).toBeCloseTo(BASE_SPEED + SPEED_INCREASE_RATE * t, 10)
    },
  )

  it('adds the same amount for every extra second before the cap', () => {
    const steps: number[] = []
    for (let t = 0; t + 1 <= TIME_TO_CAP; t++) {
      steps.push(currentSpeed(t + 1) - currentSpeed(t))
    }

    expect(steps.length).toBeGreaterThan(5)
    for (const step of steps) expect(step).toBeCloseTo(SPEED_INCREASE_RATE, 10)
  })

  it('doubles its gain over BASE_SPEED when the time doubles', () => {
    const gainAt10 = currentSpeed(10) - BASE_SPEED
    const gainAt20 = currentSpeed(20) - BASE_SPEED

    expect(gainAt20).toBeCloseTo(gainAt10 * 2, 10)
  })

  it('is strictly faster one frame later while still below the cap', () => {
    expect(currentSpeed(10 + 1 / 60)).toBeGreaterThan(currentSpeed(10))
  })

  it('is above BASE_SPEED as soon as any time has passed', () => {
    expect(currentSpeed(0.001)).toBeGreaterThan(BASE_SPEED)
  })
})

describe('currentSpeed: the cap', () => {
  it('has a cap above the starting speed, reached after a positive time', () => {
    expect(MAX_SPEED).toBeGreaterThan(BASE_SPEED)
    expect(TIME_TO_CAP).toBeGreaterThan(0)
  })

  it('is still just under MAX_SPEED a moment before the cap point', () => {
    const speed = currentSpeed(TIME_TO_CAP - 0.01)

    expect(speed).toBeLessThan(MAX_SPEED)
    expect(speed).toBeCloseTo(MAX_SPEED - SPEED_INCREASE_RATE * 0.01, 10)
  })

  it.each([0.001, 0.5, 10, 1e6, Number.MAX_SAFE_INTEGER, Infinity])(
    'is exactly MAX_SPEED at %f s past the cap point',
    (extra) => {
      expect(currentSpeed(TIME_TO_CAP + extra)).toBe(MAX_SPEED)
    },
  )

  it('never goes above MAX_SPEED or below BASE_SPEED at any point of a long run', () => {
    for (let t = 0; t <= TIME_TO_CAP * 3; t += 0.25) {
      const speed = currentSpeed(t)
      expect(speed).toBeGreaterThanOrEqual(BASE_SPEED)
      expect(speed).toBeLessThanOrEqual(MAX_SPEED)
    }
  })

  it('follows the same curve when time is added up frame by frame, as the game loop does', () => {
    let elapsed = 0
    for (let frame = 0; frame < 60 * 20; frame++) elapsed += 1 / 60 // 20 seconds at 60fps

    expect(currentSpeed(elapsed)).toBeCloseTo(BASE_SPEED + SPEED_INCREASE_RATE * 20, 6)
  })
})

describe('calculateScore: grows with time', () => {
  it.each([
    [1, SCORE_RATE],
    [2, SCORE_RATE * 2],
    [10, SCORE_RATE * 10],
    [60, SCORE_RATE * 60],
    [600, SCORE_RATE * 600],
  ])('is %i s times SCORE_RATE for a whole number of seconds', (seconds, expected) => {
    expect(calculateScore(seconds)).toBe(expected)
  })

  it('doubles when the time doubles', () => {
    expect(calculateScore(40)).toBe(calculateScore(20) * 2)
  })

  it('gives exactly k points after k point-lengths of time, for many k', () => {
    for (let k = 0; k <= 5000; k++) {
      expect(calculateScore(k / SCORE_RATE)).toBe(k)
    }
  })

  it('does not award the next point a moment before it is earned', () => {
    expect(calculateScore(5 / SCORE_RATE - 0.0001)).toBe(4)
    expect(calculateScore(5 / SCORE_RATE)).toBe(5)
  })

  it('stays at 0 until the first point is fully earned', () => {
    expect(calculateScore(0.5 / SCORE_RATE)).toBe(0)
    expect(calculateScore(0.999 / SCORE_RATE)).toBe(0)
    expect(calculateScore(1 / SCORE_RATE)).toBe(1)
  })

  it('keeps counting after the speed has reached its cap', () => {
    const atCap = calculateScore(TIME_TO_CAP)
    const later = calculateScore(TIME_TO_CAP + 30)

    expect(later - atCap).toBe(SCORE_RATE * 30)
  })
})

describe('calculateScore: always a whole number', () => {
  it.each([0, 0.001, 0.0166, 0.05, 0.1, 0.333333, 1 / 3, Math.PI, 12.3456789, 59.9999, 1234.5678])(
    'is an integer at t = %f s',
    (t) => {
      const score = calculateScore(t)

      expect(Number.isInteger(score)).toBe(true)
      expect(score).toBeGreaterThanOrEqual(0)
    },
  )

  it('is an integer on every frame of a two minute run at 60fps', () => {
    let elapsed = 0
    for (let frame = 0; frame < 60 * 120; frame++) {
      elapsed += 1 / 60
      expect(Number.isInteger(calculateScore(elapsed))).toBe(true)
    }
  })

  it('is an integer on every frame at uneven frame times', () => {
    const frameTimes = [1 / 144, 1 / 60, 0.021, 1 / 30, 0.05]
    let elapsed = 0
    for (let frame = 0; frame < 5000; frame++) {
      elapsed += frameTimes[frame % frameTimes.length]
      expect(Number.isInteger(calculateScore(elapsed))).toBe(true)
    }
  })

  it('is a safe integer even for a very long run', () => {
    expect(Number.isSafeInteger(calculateScore(24 * 60 * 60))).toBe(true) // one day
  })
})

describe('calculateScore: frame by frame, as the game loop uses it', () => {
  it('never jumps by more than one point between two 60fps frames', () => {
    let elapsed = 0
    let previous = 0
    for (let frame = 0; frame < 60 * 60; frame++) {
      elapsed += 1 / 60
      const score = calculateScore(elapsed)
      expect(score - previous).toBeGreaterThanOrEqual(0)
      expect(score - previous).toBeLessThanOrEqual(1)
      previous = score
    }
  })

  it('lands within one point of 60 * SCORE_RATE after a minute of 60fps frames', () => {
    let elapsed = 0
    for (let frame = 0; frame < 60 * 60; frame++) elapsed += 1 / 60

    // Adding 1/60 many times drifts by a hair, so the last point may not be counted yet.
    const score = calculateScore(elapsed)
    expect(score).toBeGreaterThanOrEqual(SCORE_RATE * 60 - 1)
    expect(score).toBeLessThanOrEqual(SCORE_RATE * 60)
  })

  it('changes value about SCORE_RATE times per second, not once per frame', () => {
    let elapsed = 0
    let previous = 0
    let changes = 0
    for (let frame = 0; frame < 60 * 10; frame++) {
      elapsed += 1 / 60
      const score = calculateScore(elapsed)
      if (score !== previous) changes++
      previous = score
    }

    // 10 seconds: about 10 * SCORE_RATE changes, far fewer than the 600 frames.
    expect(changes).toBeGreaterThanOrEqual(SCORE_RATE * 10 - 1)
    expect(changes).toBeLessThanOrEqual(SCORE_RATE * 10)
  })
})

describe('the curve stays fair at top speed', () => {
  it('leaves ground time between two obstacles spawned as close together as allowed', () => {
    const airTime = (2 * JUMP_FORCE) / GRAVITY

    // Obstacles arrive at least SPAWN_INTERVAL_MIN apart in time at any speed,
    // so the mascot must be able to land and stand for a moment in between.
    expect(SPAWN_INTERVAL_MIN - airTime).toBeGreaterThan(0.15)
  })

  it('cannot move an obstacle through the whole mascot in one capped frame', () => {
    const maxStep = MAX_SPEED * 0.05 // GameCanvas caps a frame at 0.05s
    const mascotWidth = MASCOT_SIZE
    const narrowest = Math.min(...OBSTACLE_SIZES.map((size) => size.width))

    expect(maxStep).toBeLessThan(mascotWidth + narrowest)
  })
})
