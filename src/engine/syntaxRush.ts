import {
  COIN_VALUE,
  GRACE_RECOVER,
  GRACE_SLOW_FACTOR,
  LETTER_CHANCE_TIER_1,
  LETTER_CHANCE_TIER_2,
  OBSTACLE_SIZES,
  SYNTAX_BASE_SPEED,
  SYNTAX_LETTERS,
  SYNTAX_MAX_SPEED,
  SYNTAX_MIN_WIDTH,
  SYNTAX_SPAWN_INTERVAL_MAX,
  SYNTAX_SPAWN_INTERVAL_MIN,
  SYNTAX_SPEED_INCREASE_RATE,
  SYNTAX_SYMBOLS_TIER_1,
  SYNTAX_SYMBOLS_TIER_2,
  SYNTAX_TIER_2_SCORE,
  SYNTAX_VIEW_WIDTH,
} from '../constants/game'
import { calculateScore } from './score'
import type { KeyClass, KeyInput, SymbolObstacle, TypingStats } from './types'

// Syntax Rush (spec 0002): bugs walk toward the mascot, each carrying one
// character. Typing that character destroys the nearest bug that shows it.
// Everything here is pure: the canvas passes in plain values and gets plain
// values back. Randomness comes in as a `random` argument (defaults to
// Math.random), so tests can pass a fixed one.

// --- Characters ---

/** The code symbols unlocked at this full score (distance plus coins). */
export function codeSymbols(score: number): readonly string[] {
  return score >= SYNTAX_TIER_2_SCORE
    ? [...SYNTAX_SYMBOLS_TIER_1, ...SYNTAX_SYMBOLS_TIER_2]
    : SYNTAX_SYMBOLS_TIER_1
}

/** Chance that the next bug carries a letter rather than a code symbol. */
export function letterChance(score: number): number {
  return score >= SYNTAX_TIER_2_SCORE ? LETTER_CHANCE_TIER_2 : LETTER_CHANCE_TIER_1
}

/**
 * Picks the character for a new bug. First rolls letter or code symbol by the
 * tier's chance, then picks evenly inside that pool, never repeating
 * `previous` (the last bug's character), so the same key never comes twice in a row.
 */
export function pickSymbol(
  score: number,
  previous: string | null,
  random: () => number = Math.random,
): string {
  const pool = random() < letterChance(score) ? SYNTAX_LETTERS : codeSymbols(score)
  const choices = pool.filter((symbol) => symbol !== previous)
  return choices[Math.floor(random() * choices.length)]
}

const LATIN_LETTER_CODE = /^Key([A-Z])$/
// Printable ASCII only: space (0x20) to tilde (0x7e).
const isAscii = (char: string) => /^[\x20-\x7e]$/.test(char)

/**
 * Sorts a key press (rules of AC-12):
 * - ignore: not ours to touch (Escape, modifiers held, IME composition, named keys like Shift or Enter)
 * - block: stop the browser's default but do not count it (Space, held down repeats)
 * - typed: a character to match against the bugs
 *
 * On a non Latin layout (for example Cyrillic) a letter key still counts as
 * its Latin letter, found from the physical key (`code`, KeyA to KeyZ).
 */
export function classifyKey(input: KeyInput): KeyClass {
  const { key, code, repeat, ctrlKey, altKey, metaKey, isComposing } = input
  if (key === 'Escape' || isComposing || metaKey) return { kind: 'ignore' }
  // AltGr reports Ctrl and Alt together; it types characters like { on many layouts.
  if (ctrlKey && !altKey) return { kind: 'ignore' }
  // Named keys (Shift, Tab, Enter, Dead, Process) and emoji are longer than one character.
  if (key.length !== 1) return { kind: 'ignore' }
  if (key === ' ' || repeat) return { kind: 'block' }

  if (isAscii(key)) return { kind: 'typed', char: key, nonLatin: false }
  const letter = LATIN_LETTER_CODE.exec(code)
  return letter
    ? { kind: 'typed', char: letter[1].toLowerCase(), nonLatin: true }
    : { kind: 'typed', char: key, nonLatin: true }
}

/** True when a typed character matches a bug's character. Letters ignore case; code symbols match exactly. */
export function matchesSymbol(char: string, symbol: string): boolean {
  // toLowerCase, not toLocaleLowerCase: a Turkish locale would turn I into a dotless i.
  return /^[a-z]$/.test(symbol) ? char.toLowerCase() === symbol : char === symbol
}

// --- Speed, spawning and view ---

/** Scroll speed in px/s after `elapsedTime` world seconds. Grows steadily, never above SYNTAX_MAX_SPEED. */
export function syntaxSpeed(elapsedTime: number): number {
  return Math.min(SYNTAX_BASE_SPEED + SYNTAX_SPEED_INCREASE_RATE * elapsedTime, SYNTAX_MAX_SPEED)
}

/** How long to wait before the next bug, in seconds. */
export function pickSyntaxSpawnInterval(random: () => number = Math.random): number {
  return SYNTAX_SPAWN_INTERVAL_MIN + random() * (SYNTAX_SPAWN_INTERVAL_MAX - SYNTAX_SPAWN_INTERVAL_MIN)
}

/** How many CSS px one world px takes, so the play area is always SYNTAX_VIEW_WIDTH wide. */
export function syntaxViewScale(cssWidth: number): number {
  return cssWidth / SYNTAX_VIEW_WIDTH
}

/** True when a device may start Syntax Rush: a fine pointer with hover, and a wide enough window. */
export function meetsSyntaxGate(fineHover: boolean, width: number): boolean {
  return fineHover && width >= SYNTAX_MIN_WIDTH
}

/** The bug's hitbox: the same box Classic uses for its bug sprite. */
const BUG_SIZE = OBSTACLE_SIZES[1]

/** A new bug entering at the right edge of the play area, standing on the ground line. */
export function spawnSymbolObstacle(id: number, groundY: number, symbol: string): SymbolObstacle {
  return {
    id,
    symbol,
    x: SYNTAX_VIEW_WIDTH,
    y: groundY - BUG_SIZE.height,
    width: BUG_SIZE.width,
    height: BUG_SIZE.height,
  }
}

/** Scrolls every bug left by `distance` px and keeps it standing on the ground line. */
export function advanceSymbolObstacles(
  obstacles: readonly SymbolObstacle[],
  distance: number,
  groundY: number,
): SymbolObstacle[] {
  return (
    obstacles
      .map((obstacle) => ({ ...obstacle, x: obstacle.x - distance, y: groundY - obstacle.height }))
      // Bugs always reach the mascot first; this only guards against a leftover one.
      .filter((obstacle) => obstacle.x + obstacle.width > 0)
  )
}

// --- Targeting and typing ---

/** Bugs fully inside the play area. Only these show their character and can be typed. */
export function visibleObstacles(obstacles: readonly SymbolObstacle[]): SymbolObstacle[] {
  return obstacles.filter((obstacle) => obstacle.x + obstacle.width <= SYNTAX_VIEW_WIDTH)
}

/** The visible bug nearest the mascot (smallest x), drawn highlighted. Null when none is visible. */
export function findTarget(obstacles: readonly SymbolObstacle[]): SymbolObstacle | null {
  let target: SymbolObstacle | null = null
  for (const obstacle of visibleObstacles(obstacles)) {
    if (!target || obstacle.x < target.x) target = obstacle
  }
  return target
}

/**
 * Which bug a typed character destroys: the nearest visible one whose
 * character matches (the target if it matches). Returns its id, or null for a wrong key.
 */
export function resolveKey(char: string, obstacles: readonly SymbolObstacle[]): number | null {
  const matching = visibleObstacles(obstacles).filter((obstacle) => matchesSymbol(char, obstacle.symbol))
  return findTarget(matching)?.id ?? null
}

// --- Grace, score and stats ---

/**
 * How fast the world runs during grace, as a share of normal time:
 * GRACE_SLOW_FACTOR at first, easing back to 1 over the last GRACE_RECOVER
 * seconds, and 1 once grace is over.
 */
export function graceSpeedFactor(graceLeft: number): number {
  if (graceLeft <= 0) return 1
  if (graceLeft > GRACE_RECOVER) return GRACE_SLOW_FACTOR
  const factor = 1 - (1 - GRACE_SLOW_FACTOR) * (graceLeft / GRACE_RECOVER)
  return Math.min(1, Math.max(GRACE_SLOW_FACTOR, factor))
}

/** Score: the same distance score as Classic, plus COIN_VALUE for every bug destroyed. */
export function syntaxScore(elapsedTime: number, destroyed: number): number {
  return calculateScore(elapsedTime) + destroyed * COIN_VALUE
}

/**
 * WPM and accuracy for the Game Over screen.
 * WPM counts correct keys only (5 keys = 1 word) over active minutes; runs
 * under 1 s show 0. Accuracy is rounded down, so 100 means no wrong key at all.
 */
export function typingStats(correct: number, wrong: number, activeSeconds: number): TypingStats {
  const wpm = activeSeconds < 1 ? 0 : Math.round(correct / 5 / (activeSeconds / 60))
  const total = correct + wrong
  const accuracy = total === 0 ? null : Math.floor((100 * correct) / total)
  return { wpm, accuracy }
}
