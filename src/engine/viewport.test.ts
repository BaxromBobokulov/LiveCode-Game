import { describe, expect, it } from 'vitest'
import {
  FULL_SCALE_MIN_HEIGHT,
  FULL_SCALE_MIN_WIDTH,
  MASCOT_SIZE,
  MASCOT_X,
  MAX_SPEED,
  REFERENCE_PHONE_WIDTH,
  SCALE,
} from '../constants/game'
import { drawScale } from './viewport'

/**
 * Seconds an obstacle is on screen before it reaches the mascot, at MAX_SPEED,
 * on a screen `width` CSS px wide. The visible track is width / drawScale world px.
 */
const reactionTime = (width: number, height: number) => {
  const worldWidth = width / drawScale(width, height)
  return (worldWidth - MASCOT_X - MASCOT_SIZE) / MAX_SPEED
}

/** The original reaction time: the reference phone at base size (before SCALE). */
const originalReaction = (REFERENCE_PHONE_WIDTH - 80 - 48) / 550

describe('drawScale', () => {
  it('draws the world 1:1 (full SCALE) on a large screen', () => {
    expect(drawScale(1536, 695)).toBe(1)
    expect(drawScale(1920, 1080)).toBe(1)
  })

  it('draws at base size (1 / SCALE) on a phone, portrait or sideways', () => {
    expect(drawScale(390, 844)).toBe(1 / SCALE)
    expect(drawScale(360, 640)).toBe(1 / SCALE)
    expect(drawScale(844, 390)).toBe(1 / SCALE)
  })

  it('switches exactly at the width and height breakpoints', () => {
    expect(drawScale(FULL_SCALE_MIN_WIDTH, FULL_SCALE_MIN_HEIGHT)).toBe(1)
    expect(drawScale(FULL_SCALE_MIN_WIDTH - 1, FULL_SCALE_MIN_HEIGHT)).toBe(1 / SCALE)
    expect(drawScale(FULL_SCALE_MIN_WIDTH, FULL_SCALE_MIN_HEIGHT - 1)).toBe(1 / SCALE)
  })
})

describe('reaction time at MAX_SPEED', () => {
  it('is about 0.48 s on the reference phone, as before SCALE', () => {
    expect(originalReaction).toBeCloseTo(0.476, 3)
    expect(reactionTime(REFERENCE_PHONE_WIDTH, 844)).toBeCloseTo(originalReaction, 10)
  })

  it('never drops below the original on any screen at least as wide as the reference phone', () => {
    for (let width = REFERENCE_PHONE_WIDTH; width <= 3000; width += 1) {
      for (const height of [360, 600, FULL_SCALE_MIN_HEIGHT, 1080]) {
        expect(reactionTime(width, height)).toBeGreaterThanOrEqual(originalReaction - 1e-9)
      }
    }
  })

  it('is the same as before SCALE on a narrower phone (360 px)', () => {
    expect(reactionTime(360, 640)).toBeCloseTo((360 - 80 - 48) / 550, 10)
  })
})
