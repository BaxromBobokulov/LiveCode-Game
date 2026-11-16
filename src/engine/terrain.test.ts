import { describe, expect, it } from 'vitest'
import { MASCOT_SIZE, PLATFORM_RISE, SCALE, STEP_TOLERANCE } from '../constants/game'
import { checkAnyCollision } from './collision'
import { applyGravity, applyVelocity, jump } from './physics'
import { floorY, platformTop, platformWalls } from './terrain'
import type { Entity, Platform } from './types'

const GROUND_Y = 500
/** A base (SCALE 1) length or speed in px, at the game's current SCALE. */
const px = (base: number) => base * SCALE
const SIZE = MASCOT_SIZE
const MASCOT_X = px(80)
/** One frame at 60 fps. */
const DT = 1 / 60

const platform: Platform = { x: px(60), width: px(400), rise: PLATFORM_RISE }
const TOP = GROUND_Y - PLATFORM_RISE

/** A mascot whose bottom edge sits at `bottom`. */
const mascotAt = (bottom: number, overrides: Partial<Entity> = {}): Entity => ({
  x: MASCOT_X,
  y: bottom - SIZE,
  vy: 0,
  width: SIZE,
  height: SIZE,
  onGround: false,
  ...overrides,
})

/** One frame of the game loop's mascot step: floor lookup, then physics. */
const step = (mascot: Entity, prevBottom: number, platforms: Platform[]) =>
  applyVelocity(applyGravity(mascot, DT), DT, floorY(mascot, prevBottom, platforms, GROUND_Y))

describe('platformTop', () => {
  it('is the ground line minus the rise', () => {
    expect(platformTop(platform, GROUND_Y)).toBe(GROUND_Y - PLATFORM_RISE)
  })

  it('follows the ground line when it moves', () => {
    expect(platformTop(platform, 300)).toBe(300 - PLATFORM_RISE)
  })
})

describe('floorY', () => {
  it('is the base ground when there are no platforms', () => {
    expect(floorY(mascotAt(GROUND_Y), GROUND_Y, [], GROUND_Y)).toBe(GROUND_Y)
  })

  it('is the platform top for a mascot above it', () => {
    const mascot = mascotAt(TOP - px(20))

    expect(floorY(mascot, TOP - px(20), [platform], GROUND_Y)).toBe(TOP)
  })

  it('is the platform top for a mascot standing exactly on it', () => {
    expect(floorY(mascotAt(TOP), TOP, [platform], GROUND_Y)).toBe(TOP)
  })

  it('is the base ground for a mascot that is not over the platform', () => {
    const ahead: Platform = { ...platform, x: MASCOT_X + SIZE } // starts at the mascot's right edge

    expect(floorY(mascotAt(TOP - px(20)), TOP - px(20), [ahead], GROUND_Y)).toBe(GROUND_Y)
  })

  it('still counts the platform while only a sliver of the mascot is over it', () => {
    const almostPast: Platform = { ...platform, x: MASCOT_X - platform.width + 1 }

    expect(floorY(mascotAt(TOP), TOP, [almostPast], GROUND_Y)).toBe(TOP)
  })

  it('does not snap up a mascot on the base ground that runs into the side (AC-5)', () => {
    expect(floorY(mascotAt(GROUND_Y), GROUND_Y, [platform], GROUND_Y)).toBe(GROUND_Y)
  })

  it('steps up a mascot whose feet are within STEP_TOLERANCE below the top (AC-6)', () => {
    expect(floorY(mascotAt(TOP + px(4)), TOP + px(4), [platform], GROUND_Y)).toBe(TOP)
    expect(floorY(mascotAt(TOP + STEP_TOLERANCE), TOP + STEP_TOLERANCE, [platform], GROUND_Y)).toBe(
      TOP,
    )
  })

  it('does not step up a mascot just past STEP_TOLERANCE below the top', () => {
    const bottom = TOP + STEP_TOLERANCE + 1

    expect(floorY(mascotAt(bottom), bottom, [platform], GROUND_Y)).toBe(GROUND_Y)
  })

  it('picks the highest top when two platforms overlap the mascot', () => {
    const higher: Platform = { ...platform, rise: PLATFORM_RISE * 2 }

    expect(floorY(mascotAt(0), 0, [platform, higher], GROUND_Y)).toBe(GROUND_Y - PLATFORM_RISE * 2)
  })
})

describe('platformWalls', () => {
  it('returns one wall box per platform', () => {
    expect(platformWalls([platform, { ...platform, x: px(900) }], GROUND_Y)).toHaveLength(2)
  })

  it('spans the platform width, from STEP_TOLERANCE below the top down to the ground', () => {
    const [wall] = platformWalls([platform], GROUND_Y)

    expect(wall).toEqual({
      x: platform.x,
      y: TOP + STEP_TOLERANCE,
      width: platform.width,
      height: PLATFORM_RISE - STEP_TOLERANCE,
    })
    expect(wall.y + wall.height).toBe(GROUND_Y)
  })

  it('is empty for no platforms', () => {
    expect(platformWalls([], GROUND_Y)).toEqual([])
  })
})

describe('landing, running along, and dropping off (AC-3, AC-4)', () => {
  it('lands a falling mascot on the top, with onGround true', () => {
    let mascot = mascotAt(TOP - px(30), { vy: px(200) })
    let prevBottom = mascot.y + SIZE

    for (let i = 0; i < 30; i++) {
      mascot = step(mascot, prevBottom, [platform])
      prevBottom = mascot.y + SIZE
    }

    expect(mascot.y + SIZE).toBe(TOP)
    expect(mascot.onGround).toBe(true)
    expect(checkAnyCollision(mascot, platformWalls([platform], GROUND_Y))).toBe(false)
  })

  it('lets the mascot jump again from the top', () => {
    const standing = mascotAt(TOP, { onGround: true })

    const jumped = jump(standing)

    expect(jumped.vy).toBeLessThan(0)
    expect(jumped.onGround).toBe(false)
  })

  it('does not tunnel through the top on a single fast falling frame', () => {
    // Feet px(5) above the top, falling fast enough to end the frame about px(50) below it.
    const mascot = mascotAt(TOP - px(5), { vy: px(3000) })

    const next = step(mascot, TOP - px(5), [platform])

    expect(next.y + SIZE).toBe(TOP)
    expect(next.onGround).toBe(true)
  })

  it('falls back to the base ground once the platform has scrolled fully past', () => {
    // The platform has just left the mascot: its right edge is at the mascot's left edge.
    const passed: Platform = { ...platform, x: MASCOT_X - platform.width }
    let mascot = mascotAt(TOP, { onGround: true })
    let prevBottom = TOP

    mascot = step(mascot, prevBottom, [passed])
    expect(mascot.onGround).toBe(false)

    for (let i = 0; i < 60; i++) {
      prevBottom = mascot.y + SIZE
      mascot = step(mascot, prevBottom, [passed])
    }

    expect(mascot.y + SIZE).toBe(GROUND_Y)
    expect(mascot.onGround).toBe(true)
  })
})

describe('hitting the side (AC-5) and stepping up (AC-6)', () => {
  it('a mascot on the base ground running into the side hits the wall', () => {
    const touching: Platform = { ...platform, x: MASCOT_X + SIZE - px(2) }
    const mascot = step(mascotAt(GROUND_Y, { onGround: true }), GROUND_Y, [touching])

    expect(mascot.y + SIZE).toBe(GROUND_Y)
    expect(checkAnyCollision(mascot, platformWalls([touching], GROUND_Y))).toBe(true)
  })

  it('a mascot with feet px(4) below the top steps up with no hit', () => {
    const touching: Platform = { ...platform, x: MASCOT_X + SIZE - px(2) }
    const mascot = step(mascotAt(TOP + px(4), { vy: px(100) }), TOP + px(4), [touching])

    expect(mascot.y + SIZE).toBe(TOP)
    expect(checkAnyCollision(mascot, platformWalls([touching], GROUND_Y))).toBe(false)
  })
})
