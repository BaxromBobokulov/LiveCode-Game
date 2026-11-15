import { describe, expect, it } from 'vitest'
import { GRAVITY, JUMP_FORCE } from '../constants/game'
import { applyGravity, applyVelocity, jump } from './physics'
import type { Entity } from './types'

const GROUND_Y = 500
const SIZE = 48
/** The y of an entity's top edge when it rests on the ground. */
const RESTING_Y = GROUND_Y - SIZE

/** A 48px entity standing on the ground. */
const standing: Entity = { x: 80, y: RESTING_Y, vy: 0, width: SIZE, height: SIZE, onGround: true }

/** The same entity, somewhere in the air. */
const airborne = (y: number, vy: number): Entity => ({ ...standing, y, vy, onGround: false })

describe('applyGravity', () => {
  it('increases vy by GRAVITY * dt', () => {
    expect(applyGravity({ ...standing, vy: 100 }, 0.5).vy).toBe(100 + GRAVITY * 0.5)
  })

  it.each([1 / 144, 1 / 60, 1 / 30, 0.05, 0.25, 1])(
    'adds exactly GRAVITY * dt to vy for dt = %f',
    (dt) => {
      const rising = airborne(200, -300)

      const next = applyGravity(rising, dt)

      expect(next.vy).toBeCloseTo(-300 + GRAVITY * dt, 10)
    },
  )

  it('leaves vy unchanged when dt is 0', () => {
    expect(applyGravity(airborne(200, -300), 0).vy).toBe(-300)
  })

  it('accumulates over several steps the same as one step of the total time', () => {
    const start = airborne(200, 0)

    let stepped = start
    for (let i = 0; i < 10; i++) stepped = applyGravity(stepped, 0.01)

    expect(stepped.vy).toBeCloseTo(applyGravity(start, 0.1).vy, 8)
  })

  it('turns an upward velocity into a downward one given enough time', () => {
    const rising = airborne(200, -JUMP_FORCE)

    const next = applyGravity(rising, 1)

    expect(next.vy).toBeGreaterThan(0)
  })

  it('changes only vy', () => {
    const start = airborne(200, -300)

    const next = applyGravity(start, 0.016)

    expect({ ...next, vy: start.vy }).toEqual(start)
  })

  it('does not mutate the input', () => {
    const entity = { ...standing }
    applyGravity(entity, 0.016)
    expect(entity).toEqual(standing)
  })
})

describe('applyVelocity', () => {
  it('moves y by vy * dt while in the air', () => {
    const next = applyVelocity(airborne(100, -200), 0.1, GROUND_Y)

    expect(next.y).toBe(80)
    expect(next.vy).toBe(-200)
    expect(next.onGround).toBe(false)
  })

  it.each([1 / 144, 1 / 60, 1 / 30, 0.05])(
    'moves y by exactly vy * dt while falling in the air for dt = %f',
    (dt) => {
      const falling = airborne(100, 400)

      const next = applyVelocity(falling, dt, GROUND_Y)

      expect(next.y).toBeCloseTo(100 + 400 * dt, 10)
      expect(next.vy).toBe(400)
      expect(next.onGround).toBe(false)
    },
  )

  it('does not move when dt is 0', () => {
    const start = airborne(100, 400)

    expect(applyVelocity(start, 0, GROUND_Y)).toEqual(start)
  })

  it('clamps to the ground and zeroes vy on landing', () => {
    const falling = airborne(GROUND_Y - 50, 900)

    const next = applyVelocity(falling, 0.1, GROUND_Y)

    expect(next.y).toBe(RESTING_Y)
    expect(next.vy).toBe(0)
    expect(next.onGround).toBe(true)
  })

  it('lands when the step ends exactly on the ground', () => {
    // 100px above resting, falling at 1000px/s for 0.1s = exactly 100px.
    const falling = airborne(RESTING_Y - 100, 1000)

    const next = applyVelocity(falling, 0.1, GROUND_Y)

    expect(next.y).toBe(RESTING_Y)
    expect(next.vy).toBe(0)
    expect(next.onGround).toBe(true)
  })

  it('stays in the air when the step ends just above the ground', () => {
    const falling = airborne(RESTING_Y - 100, 990)

    const next = applyVelocity(falling, 0.1, GROUND_Y)

    expect(next.y).toBeCloseTo(RESTING_Y - 1, 10)
    expect(next.vy).toBe(990)
    expect(next.onGround).toBe(false)
  })

  it.each([0.5, 1, 10, 1000])(
    'never tunnels through the ground with a very large dt of %f s',
    (dt) => {
      const falling = airborne(0, 2000)

      const next = applyVelocity(falling, dt, GROUND_Y)

      expect(next.y).toBe(RESTING_Y)
      expect(next.vy).toBe(0)
      expect(next.onGround).toBe(true)
    },
  )

  it('never ends below the ground at extreme falling speed', () => {
    const falling = airborne(RESTING_Y - 1, 1_000_000)

    const next = applyVelocity(falling, 1 / 60, GROUND_Y)

    expect(next.y + next.height).toBe(GROUND_Y)
  })

  it('pulls an entity that starts below the ground back up onto it', () => {
    // Happens when the canvas shrinks and the ground line moves up.
    const sunk: Entity = { ...standing, y: RESTING_Y + 120 }

    const next = applyVelocity(sunk, 1 / 60, GROUND_Y)

    expect(next.y).toBe(RESTING_Y)
    expect(next.onGround).toBe(true)
  })

  it('leaves the ground when moving upward', () => {
    const launching: Entity = { ...standing, vy: -JUMP_FORCE }

    const next = applyVelocity(launching, 1 / 60, GROUND_Y)

    expect(next.y).toBeLessThan(RESTING_Y)
    expect(next.vy).toBe(-JUMP_FORCE)
    expect(next.onGround).toBe(false)
  })

  it('marks a stale onGround flag false when the entity is in the air', () => {
    // Happens when the canvas grows and the ground line moves down.
    const floating: Entity = { ...standing, y: RESTING_Y - 200, onGround: true }

    const next = applyVelocity(floating, 1 / 60, GROUND_Y)

    expect(next.onGround).toBe(false)
  })

  it('keeps a standing entity on the ground under gravity', () => {
    const next = applyVelocity(applyGravity(standing, 0.016), 0.016, GROUND_Y)

    expect(next.y).toBe(standing.y)
    expect(next.vy).toBe(0)
    expect(next.onGround).toBe(true)
  })

  it('uses the entity height to find the resting position', () => {
    const tall: Entity = { ...airborne(0, 5000), height: 100 }

    const next = applyVelocity(tall, 1, GROUND_Y)

    expect(next.y).toBe(GROUND_Y - 100)
  })

  it('changes only y, vy and onGround', () => {
    const start = airborne(100, 400)

    const next = applyVelocity(start, 0.05, GROUND_Y)

    expect(next.x).toBe(start.x)
    expect(next.width).toBe(start.width)
    expect(next.height).toBe(start.height)
  })

  it('does not mutate the input', () => {
    const start = airborne(GROUND_Y - 50, 900)
    const copy = { ...start }

    applyVelocity(start, 0.1, GROUND_Y)

    expect(start).toEqual(copy)
  })
})

describe('jump', () => {
  it('sets vy to -JUMP_FORCE when on the ground', () => {
    const next = jump(standing)

    expect(next.vy).toBe(-JUMP_FORCE)
    expect(next.onGround).toBe(false)
  })

  it('does not move the entity by itself', () => {
    const next = jump(standing)

    expect(next.x).toBe(standing.x)
    expect(next.y).toBe(standing.y)
  })

  it('does nothing in mid-air (no double jump)', () => {
    const rising = airborne(200, -100)

    expect(jump(rising)).toEqual(rising)
  })

  it('does nothing while falling', () => {
    const falling = airborne(200, 600)

    expect(jump(falling)).toEqual(falling)
  })

  it('ignores a second jump right after the first', () => {
    const once = jump(standing)

    const twice = jump(once)

    expect(twice).toEqual(once)
  })

  it('does not mutate the input', () => {
    const entity = { ...standing }
    jump(entity)
    expect(entity).toEqual(standing)
  })
})

describe('a full jump', () => {
  /** Simulates one jump with a fixed step until it lands. */
  const simulateJump = (dt: number) => {
    let entity = jump(standing)
    let highestY = entity.y
    let steps = 0

    while (!entity.onGround && steps < 10_000) {
      entity = applyVelocity(applyGravity(entity, dt), dt, GROUND_Y)
      highestY = Math.min(highestY, entity.y)
      steps++
    }

    return { entity, peakHeight: standing.y - highestY, airTime: steps * dt }
  }

  it.each([1 / 144, 1 / 60, 1 / 30, 0.05])(
    'rises, falls and lands exactly on the ground with dt = %f',
    (dt) => {
      const { entity, peakHeight } = simulateJump(dt)

      expect(entity.onGround).toBe(true)
      expect(entity.y).toBe(standing.y)
      expect(entity.vy).toBe(0)
      expect(peakHeight).toBeGreaterThan(0)
    },
  )

  it('has air time close to the analytic 2 * JUMP_FORCE / GRAVITY at 60fps', () => {
    const { airTime } = simulateJump(1 / 60)

    expect(airTime).toBeCloseTo((2 * JUMP_FORCE) / GRAVITY, 1)
  })

  it('never rises above the analytic peak of JUMP_FORCE² / (2 * GRAVITY)', () => {
    const analyticPeak = JUMP_FORCE ** 2 / (2 * GRAVITY)

    for (const dt of [1 / 144, 1 / 60, 1 / 30, 0.05]) {
      expect(simulateJump(dt).peakHeight).toBeLessThanOrEqual(analyticPeak)
    }
  })

  it('reaches a similar peak at 144fps and 30fps (within 15%)', () => {
    const fast = simulateJump(1 / 144).peakHeight
    const slow = simulateJump(1 / 30).peakHeight

    expect(Math.abs(fast - slow) / fast).toBeLessThan(0.15)
  })

  it('can jump again after landing', () => {
    const { entity: landed } = simulateJump(1 / 60)

    const next = jump(landed)

    expect(next.vy).toBe(-JUMP_FORCE)
    expect(next.onGround).toBe(false)
  })
})
