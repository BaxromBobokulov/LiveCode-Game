import { FULL_SCALE_MIN_HEIGHT, FULL_SCALE_MIN_WIDTH, SCALE } from '../constants/game'

// How big the game world is drawn on a given screen.
//
// The engine always works in world px, which are SCALE times the base tuning
// (see constants/game.ts). On a screen big enough in both directions the world
// is drawn 1:1, so it looks SCALE times bigger than the base tuning. On a
// smaller screen (a phone) it is drawn at 1 / SCALE, back to base size, so the
// player sees as much of the track ahead as before SCALE existed.
//
// Only the drawing changes. Speeds, jump time and spawn timing are the same in
// world units on every screen, so the game plays the same; what differs is how
// much track fits on screen, and that is what the breakpoints protect.

/**
 * How many CSS px one world px takes on a `width` × `height` screen (CSS px):
 * 1 on a big screen, 1 / SCALE on a small one.
 */
export function drawScale(width: number, height: number): number {
  return width >= FULL_SCALE_MIN_WIDTH && height >= FULL_SCALE_MIN_HEIGHT ? 1 : 1 / SCALE
}
