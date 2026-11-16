import { STEP_TOLERANCE } from '../constants/game'
import type { Entity, Obstacle, Platform } from './types'

// Raised ground ("platforms") on top of the flat base ground line.
//
// The whole mechanic is two questions, answered fresh every frame:
//
// 1. Where is the floor under the mascot? (floorY)
//    The top of a platform counts as floor only if the mascot is over it AND
//    its feet were already at or above that top on the previous frame (within
//    STEP_TOLERANCE). That "previous frame" rule is what lets a falling mascot
//    land on top, while a mascot running into the side does not get snapped up.
//
// 2. Which parts of a platform are deadly? (platformWalls)
//    Everything except a thin band at the very top. Those boxes are plain
//    Obstacles, so the normal collision check handles them.
//
// physics.ts and collision.ts know nothing about platforms: the game loop just
// passes floorY to applyVelocity, and the walls to checkAnyCollision.

/** The y of a platform's top edge, given the base ground line. */
export function platformTop(platform: Platform, groundY: number): number {
  return groundY - platform.rise
}

/** True when any part of the mascot's width is over the platform. */
function isOver(mascot: Entity, platform: Platform): boolean {
  return mascot.x < platform.x + platform.width && mascot.x + mascot.width > platform.x
}

/**
 * The floor line under the mascot this frame: the highest platform top the
 * mascot is over and was already above (`prevBottom` is the mascot's bottom
 * edge on the previous frame), otherwise the base ground `groundY`.
 */
export function floorY(
  mascot: Entity,
  prevBottom: number,
  platforms: readonly Platform[],
  groundY: number,
): number {
  let floor = groundY
  for (const platform of platforms) {
    const top = platformTop(platform, groundY)
    // Smaller y is higher on screen.
    if (isOver(mascot, platform) && prevBottom <= top + STEP_TOLERANCE && top < floor) {
      floor = top
    }
  }
  return floor
}

/**
 * The deadly part of each platform, as obstacle boxes: from STEP_TOLERANCE
 * below its top down to the base ground. Touching one ends the run, just like
 * an obstacle. The thin band above it is left out, so a mascot standing on the
 * top (or stepping up a few px) never counts as a hit.
 */
export function platformWalls(platforms: readonly Platform[], groundY: number): Obstacle[] {
  return platforms.map((platform) => {
    const top = platformTop(platform, groundY)
    return {
      x: platform.x,
      y: top + STEP_TOLERANCE,
      width: platform.width,
      height: platform.rise - STEP_TOLERANCE,
    }
  })
}
