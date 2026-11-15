import type { Entity, Obstacle } from './types'

/**
 * AABB (axis-aligned bounding box) check: true when the two rectangles overlap.
 * Boxes that only touch along an edge do not count as a hit.
 */
export function checkCollision(mascot: Entity, obstacle: Obstacle): boolean {
  return (
    mascot.x < obstacle.x + obstacle.width &&
    mascot.x + mascot.width > obstacle.x &&
    mascot.y < obstacle.y + obstacle.height &&
    mascot.y + mascot.height > obstacle.y
  )
}

/** True when the mascot overlaps at least one obstacle in the list. */
export function checkAnyCollision(mascot: Entity, obstacles: readonly Obstacle[]): boolean {
  return obstacles.some((obstacle) => checkCollision(mascot, obstacle))
}
