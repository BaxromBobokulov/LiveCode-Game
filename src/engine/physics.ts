import { GRAVITY, JUMP_FORCE } from '../constants/game'
import type { Entity } from './types'

// All functions are pure: they return a new entity and never touch the input.
// dt is always delta time in seconds.

/** Accelerates the entity downward. */
export function applyGravity(entity: Entity, dt: number): Entity {
  return { ...entity, vy: entity.vy + GRAVITY * dt }
}

/**
 * Moves the entity by its velocity, then stops it at the ground.
 * groundY is the y of the ground line; the entity's bottom edge rests on it.
 */
export function applyVelocity(entity: Entity, dt: number, groundY: number): Entity {
  const y = entity.y + entity.vy * dt
  const restingY = groundY - entity.height

  if (y >= restingY) {
    return { ...entity, y: restingY, vy: 0, onGround: true }
  }
  return { ...entity, y, onGround: false }
}

/** Starts a jump, but only from the ground (no double or mid-air jumps). */
export function jump(entity: Entity): Entity {
  if (!entity.onGround) return entity
  return { ...entity, vy: -JUMP_FORCE, onGround: false }
}
