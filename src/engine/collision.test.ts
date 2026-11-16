import { describe, expect, it } from 'vitest'
import { JUMP_FORCE, MASCOT_SIZE, OBSTACLE_SIZES, SCALE } from '../constants/game'
import { checkAnyCollision, checkCollision } from './collision'
import type { Entity, Obstacle } from './types'

/**
 * A plain 48px box at (100, 100) for the pure geometry tests below. These test
 * box overlap math only, so they do not follow SCALE; the "in play" block
 * further down uses the real, scaled game sizes.
 */
const mascot: Entity = { x: 100, y: 100, vy: 0, width: 48, height: 48, onGround: true }

const box = (x: number, y: number, width = 20, height = 20): Obstacle => ({ x, y, width, height })

describe('checkCollision', () => {
  it('is true when the boxes overlap', () => {
    expect(checkCollision(mascot, box(130, 130))).toBe(true)
  })

  it('is true when the obstacle is fully inside the mascot', () => {
    expect(checkCollision(mascot, box(110, 110, 10, 10))).toBe(true)
  })

  it('is true when the mascot is fully inside the obstacle', () => {
    expect(checkCollision(mascot, box(50, 50, 200, 200))).toBe(true)
  })

  it('is true for an overlap of a single pixel', () => {
    expect(checkCollision(mascot, box(147, 147))).toBe(true)
  })

  it.each([
    ['to the right', box(200, 100)],
    ['to the left', box(40, 100)],
    ['above', box(100, 20)],
    ['below', box(100, 200)],
  ])('is false when the obstacle is clear %s', (_side, obstacle) => {
    expect(checkCollision(mascot, obstacle)).toBe(false)
  })

  it.each([
    ['right edge', box(148, 100)],
    ['left edge', box(80, 100)],
    ['bottom edge', box(100, 148)],
    ['top edge', box(100, 80)],
  ])('is false when the boxes only touch along the mascot %s', (_edge, obstacle) => {
    expect(checkCollision(mascot, obstacle)).toBe(false)
  })

  it('is false when the boxes overlap on one axis only', () => {
    // Same columns as the mascot, but well below it: a jump clearing an obstacle.
    expect(checkCollision(mascot, box(110, 160))).toBe(false)
  })
})

describe('checkCollision: partial overlaps', () => {
  // The mascot covers x 100..148 and y 100..148.
  it.each([
    ['top left corner', box(90, 90)],
    ['top right corner', box(138, 90)],
    ['bottom left corner', box(90, 138)],
    ['bottom right corner', box(138, 138)],
    ['left side', box(90, 115)],
    ['right side', box(138, 115)],
    ['top side', box(115, 90)],
    ['bottom side', box(115, 138)],
  ])('is true when the obstacle overlaps the mascot %s', (_where, obstacle) => {
    expect(checkCollision(mascot, obstacle)).toBe(true)
  })

  it('is true when the boxes are exactly the same', () => {
    expect(checkCollision(mascot, box(100, 100, 48, 48))).toBe(true)
  })

  it('is true for a tall thin obstacle crossing the whole mascot', () => {
    expect(checkCollision(mascot, box(120, 0, 4, 400))).toBe(true)
  })

  it('is true for a fractional overlap smaller than one pixel', () => {
    expect(checkCollision(mascot, box(147.9, 100))).toBe(true)
  })
})

describe('checkCollision: touching without overlapping', () => {
  it.each([
    ['top left', box(80, 80)],
    ['top right', box(148, 80)],
    ['bottom left', box(80, 148)],
    ['bottom right', box(148, 148)],
  ])('is false when the boxes only touch at the %s corner', (_corner, obstacle) => {
    expect(checkCollision(mascot, obstacle)).toBe(false)
  })

  it('is false when a tiny gap separates the boxes', () => {
    expect(checkCollision(mascot, box(148.1, 100))).toBe(false)
  })

  it('is false when the mascot lands exactly on top of an obstacle', () => {
    // Mascot bottom edge (148) rests on the obstacle top edge.
    expect(checkCollision(mascot, box(110, 148, 20, 36))).toBe(false)
  })
})

describe('checkCollision: in play', () => {
  const GROUND_Y = 500
  /** A base (SCALE 1) length or speed in px, at the game's current SCALE. */
  const px = (base: number) => base * SCALE
  /** A mascot standing on the ground at x px(80)..px(128), as in the game. */
  const standing: Entity = {
    ...mascot,
    x: px(80),
    y: GROUND_Y - MASCOT_SIZE,
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  }
  const onGround = (x: number, width: number, height: number): Obstacle => ({
    x,
    y: GROUND_Y - height,
    width,
    height,
  })

  it.each(OBSTACLE_SIZES.map((size) => [size.width, size.height] as const))(
    'a standing mascot is hit by a %ix%i obstacle that reaches it',
    (width, height) => {
      expect(checkCollision(standing, onGround(px(120), width, height))).toBe(true)
    },
  )

  it.each(OBSTACLE_SIZES.map((size) => [size.width, size.height] as const))(
    'a standing mascot is not hit by a %ix%i obstacle still ahead of it',
    (width, height) => {
      expect(checkCollision(standing, onGround(px(128), width, height))).toBe(false)
      expect(checkCollision(standing, onGround(px(400), width, height))).toBe(false)
    },
  )

  it.each(OBSTACLE_SIZES.map((size) => [size.width, size.height] as const))(
    'a mascot jumping higher than a %ix%i obstacle passes over it',
    (width, height) => {
      const jumping: Entity = { ...standing, y: GROUND_Y - MASCOT_SIZE - height - 1, onGround: false }

      expect(checkCollision(jumping, onGround(px(90), width, height))).toBe(false)
    },
  )

  it.each(OBSTACLE_SIZES.map((size) => [size.width, size.height] as const))(
    'a mascot that has not jumped high enough clips a %ix%i obstacle',
    (width, height) => {
      const tooLow: Entity = { ...standing, y: GROUND_Y - MASCOT_SIZE - height + 1, onGround: false }

      expect(checkCollision(tooLow, onGround(px(90), width, height))).toBe(true)
    },
  )

  it('gives the same answer whatever the mascot vy and onGround are', () => {
    const obstacle = onGround(px(120), px(36), px(33)) // the brace size

    expect(checkCollision({ ...standing, vy: -JUMP_FORCE, onGround: false }, obstacle)).toBe(true)
    expect(checkCollision({ ...standing, vy: px(900), onGround: false }, obstacle)).toBe(true)
  })

  it('does not mutate the mascot or the obstacle', () => {
    const mascotCopy = { ...standing }
    const obstacle = onGround(px(120), px(36), px(33)) // the brace size
    const obstacleCopy = { ...obstacle }

    checkCollision(standing, obstacle)

    expect(standing).toEqual(mascotCopy)
    expect(obstacle).toEqual(obstacleCopy)
  })
})

describe('checkAnyCollision: finding the hit', () => {
  const clear = [box(300, 100), box(500, 100), box(100, 300), box(0, 0)]
  const hit = box(130, 130)

  it.each([0, 1, 2, 3, 4])(
    'finds the one colliding obstacle at position %i among non-colliding ones',
    (position) => {
      const obstacles = [...clear.slice(0, position), hit, ...clear.slice(position)]

      expect(checkAnyCollision(mascot, obstacles)).toBe(true)
    },
  )

  it('is false for the same list without the colliding obstacle', () => {
    expect(checkAnyCollision(mascot, clear)).toBe(false)
  })

  it('is true when several obstacles collide at once', () => {
    expect(checkAnyCollision(mascot, [hit, box(110, 110), box(300, 100)])).toBe(true)
  })

  it('is true for a list with a single colliding obstacle', () => {
    expect(checkAnyCollision(mascot, [hit])).toBe(true)
  })

  it('is false when every obstacle only touches the mascot', () => {
    expect(checkAnyCollision(mascot, [box(148, 100), box(80, 100), box(100, 148)])).toBe(false)
  })

  it('does not mutate the list', () => {
    const obstacles = [...clear, hit]
    const copy = obstacles.map((o) => ({ ...o }))

    checkAnyCollision(mascot, obstacles)

    expect(obstacles).toEqual(copy)
  })
})

describe('checkAnyCollision', () => {
  it('is false for an empty list', () => {
    expect(checkAnyCollision(mascot, [])).toBe(false)
  })

  it('is false when every obstacle is clear', () => {
    expect(checkAnyCollision(mascot, [box(300, 100), box(500, 100)])).toBe(false)
  })

  it('is true when one obstacle among several overlaps', () => {
    expect(checkAnyCollision(mascot, [box(300, 100), box(130, 130), box(500, 100)])).toBe(true)
  })
})
