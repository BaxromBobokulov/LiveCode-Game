import { BASE_SPEED, MAX_SPEED, SCORE_RATE, SPEED_INCREASE_RATE } from '../constants/game'

// The difficulty curve and the score both depend on one input: how many
// seconds the current run has lasted.

/**
 * Scroll speed in px/s after `elapsedTime` seconds of a run.
 * Starts at BASE_SPEED, grows steadily, and never goes above MAX_SPEED.
 */
export function currentSpeed(elapsedTime: number): number {
  return Math.min(BASE_SPEED + SPEED_INCREASE_RATE * elapsedTime, MAX_SPEED)
}

/** Whole-number score after `elapsedTime` seconds of a run. */
export function calculateScore(elapsedTime: number): number {
  return Math.floor(elapsedTime * SCORE_RATE)
}
