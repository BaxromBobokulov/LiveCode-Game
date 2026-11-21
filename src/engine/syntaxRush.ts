import {
  COIN_VALUE,
  GRACE_RECOVER,
  GRACE_SLOW_FACTOR,
  LETTER_CHANCE_TIER_1,
  LETTER_CHANCE_TIER_2,
  MASCOT_SIZE,
  MASCOT_X,
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
  SYNTAX_MIN_VISIBLE_TIME,
  SYNTAX_WORDS_TIER_1,
  SYNTAX_WORDS_TIER_2,
  WORD_CHANCE_TIER_1,
  WORD_CHANCE_TIER_2,
  WORD_CHAR_WIDTH,
  WORD_LETTER_TIME,
  WORD_SPAWN_GAP_PER_LETTER,
  WORD_SPEED_FACTOR,
  WORD_TILE_PADDING,
} from '../constants/game'
import { calculateScore } from './score'
import type { KeyClass, KeyInput, SymbolObstacle, TypeResult, TypingStats } from './types'

// Syntax Rush (spec 0002): bugs walk toward the mascot, each carrying one
// character. Typing that character destroys the nearest bug that shows it.
// Spec 0003 adds word bugs: a keyword typed letter by letter, slower than the
// single characters. Only one word is "active" (partly typed) at a time, and
// it gets the next key first (see typeChar).
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
 * Picks the character for a new bug: a letter, picked evenly, never repeating
 * `previous` (the last bug's character), so the same key never comes twice in a row.
 *
 * Code symbols are switched off for now (2026-11-21): students lost most of
 * their lives to symbols that showed up unexpectedly. The symbol pools,
 * codeSymbols and letterChance are kept. To bring symbols back, restore the
 * commented line below, remove the letters-only line, rename `_score` back
 * to `score`, and un-comment the symbol tests in syntaxRush.test.ts.
 */
export function pickSymbol(
  _score: number, // only the commented symbol roll reads it; kept so callers need no change
  previous: string | null,
  random: () => number = Math.random,
): string {
  // const pool = random() < letterChance(score) ? SYNTAX_LETTERS : codeSymbols(score)
  const pool = SYNTAX_LETTERS
  const choices = pool.filter((symbol) => symbol !== previous)
  return choices[Math.floor(random() * choices.length)]
}

// --- Words (spec 0003) ---

/** True when an obstacle carries a whole word rather than one character. */
export function isWord(symbol: string): boolean {
  return symbol.length > 1
}

/** The words unlocked at this full score. */
export function wordPool(score: number): readonly string[] {
  return score >= SYNTAX_TIER_2_SCORE ? [...SYNTAX_WORDS_TIER_1, ...SYNTAX_WORDS_TIER_2] : SYNTAX_WORDS_TIER_1
}

/** Chance that the next spawn is a word rather than a single character. */
export function wordChance(score: number): number {
  return score >= SYNTAX_TIER_2_SCORE ? WORD_CHANCE_TIER_2 : WORD_CHANCE_TIER_1
}

/**
 * Picks a word for a new bug: never `lastWord`, and never a word starting with
 * the same letter as a word already on screen (visible or not), so the first
 * letter you type always points at one word. If every first letter is taken,
 * only the "not lastWord" rule applies. Single characters are not considered.
 */
export function pickWord(
  score: number,
  lastWord: string | null,
  onScreen: readonly SymbolObstacle[],
  random: () => number = Math.random,
): string {
  const pool = wordPool(score).filter((word) => word !== lastWord)
  const taken = new Set(onScreen.filter((o) => isWord(o.symbol)).map((o) => o.symbol[0]))
  const spread = pool.filter((word) => !taken.has(word[0]))
  const choices = spread.length > 0 ? spread : pool
  return choices[Math.floor(random() * choices.length)]
}

/**
 * Picks what a new bug carries: first rolls word or single by the tier's word
 * chance, then picks a word (pickWord) or a single character (pickSymbol,
 * never repeating `lastSymbol`, the last single spawned).
 */
export function pickSpawn(
  score: number,
  lastSymbol: string | null,
  lastWord: string | null,
  onScreen: readonly SymbolObstacle[],
  random: () => number = Math.random,
): string {
  return random() < wordChance(score)
    ? pickWord(score, lastWord, onScreen, random)
    : pickSymbol(score, lastSymbol, random)
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

/** The gap after spawning `symbol`: a normal gap, plus extra time per letter after a word. */
export function spawnGapAfter(symbol: string, random: () => number = Math.random): number {
  const extra = isWord(symbol) ? WORD_SPAWN_GAP_PER_LETTER * symbol.length : 0
  return pickSyntaxSpawnInterval(random) + extra
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
    typed: 0,
    x: SYNTAX_VIEW_WIDTH,
    y: groundY - BUG_SIZE.height,
    width: BUG_SIZE.width,
    height: BUG_SIZE.height,
  }
}

/** Width of a word's tile in px: one fixed cell per letter, plus padding on both sides. */
export function wordLabelWidth(letters: number): number {
  return letters * WORD_CHAR_WIDTH + 2 * WORD_TILE_PADDING
}

/**
 * The rightmost px an obstacle covers. A word tile can be wider than its bug
 * (it is centered on the bug), so a long word sticks out on both sides.
 */
export function rightEdge(obstacle: SymbolObstacle): number {
  const bugEdge = obstacle.x + obstacle.width
  if (!isWord(obstacle.symbol)) return bugEdge
  return Math.max(bugEdge, obstacle.x + obstacle.width / 2 + wordLabelWidth(obstacle.symbol.length) / 2)
}

/** How far a word's bug travels from the moment it is fully visible until it touches the mascot, in px. */
export function wordVisibleDistance(letters: number): number {
  const overhang = Math.max(BUG_SIZE.width, BUG_SIZE.width / 2 + wordLabelWidth(letters) / 2)
  return SYNTAX_VIEW_WIDTH - overhang - (MASCOT_X + MASCOT_SIZE)
}

/**
 * The fastest a word of this length may move, in px/s, so it stays fully
 * visible for SYNTAX_MIN_VISIBLE_TIME plus WORD_LETTER_TIME per letter.
 */
export function wordSpeedCap(letters: number): number {
  return wordVisibleDistance(letters) / (SYNTAX_MIN_VISIBLE_TIME + letters * WORD_LETTER_TIME)
}

/**
 * How fast this bug moves after `elapsedTime` world seconds, in px/s. Single
 * characters move with the world (syntaxSpeed); words move at a share of it,
 * never above their length cap.
 */
export function obstacleSpeed(symbol: string, elapsedTime: number): number {
  const speed = syntaxSpeed(elapsedTime)
  return isWord(symbol) ? Math.min(speed * WORD_SPEED_FACTOR, wordSpeedCap(symbol.length)) : speed
}

/** Moves every bug left at its own speed for `worldDt` seconds and keeps it standing on the ground line. */
export function advanceSymbolObstacles(
  obstacles: readonly SymbolObstacle[],
  elapsedTime: number,
  worldDt: number,
  groundY: number,
): SymbolObstacle[] {
  return (
    obstacles
      .map((obstacle) => ({
        ...obstacle,
        x: obstacle.x - obstacleSpeed(obstacle.symbol, elapsedTime) * worldDt,
        y: groundY - obstacle.height,
      }))
      // Bugs always reach the mascot first; this only guards against a leftover one.
      .filter((obstacle) => obstacle.x + obstacle.width > 0)
  )
}

// --- Targeting and typing ---

/** Bugs fully inside the play area (tile included). Only these show their tile and can be typed. */
export function visibleObstacles(obstacles: readonly SymbolObstacle[]): SymbolObstacle[] {
  return obstacles.filter((obstacle) => rightEdge(obstacle) <= SYNTAX_VIEW_WIDTH)
}

/** The visible bug nearest the mascot (smallest x), drawn highlighted. Null when none is visible. */
export function findTarget(obstacles: readonly SymbolObstacle[]): SymbolObstacle | null {
  let target: SymbolObstacle | null = null
  for (const obstacle of visibleObstacles(obstacles)) {
    if (!target || obstacle.x < target.x) target = obstacle
  }
  return target
}

/** The character this obstacle waits for: its own character, or a word's next untyped letter. */
export function nextChar(obstacle: SymbolObstacle): string {
  return obstacle.symbol[obstacle.typed]
}

/** The word partly typed right now (at most one), or null. */
export function activeWord(obstacles: readonly SymbolObstacle[]): SymbolObstacle | null {
  return obstacles.find((obstacle) => obstacle.typed > 0) ?? null
}

/** The obstacle drawn locked (bigger, outlined): the active word if any, else the nearest visible bug. */
export function lockTarget(obstacles: readonly SymbolObstacle[]): SymbolObstacle | null {
  return activeWord(obstacles) ?? findTarget(obstacles)
}

/**
 * What a typed character does (spec 0003, AC-8), in this order:
 * 1. It is the active word's next letter: the word moves on, and is destroyed on its last letter.
 * 2. Otherwise the nearest visible match among the singles and the untouched
 *    words (while a word is active, only words nearer than it). A single is
 *    destroyed; a word becomes active and the old active word starts over.
 * 3. Otherwise it is a miss, and nothing changes (a typo never costs progress).
 * "Nearest" is the smallest bug x; on a tie the first in the list wins. The
 * input is never changed: the result is a new list in the same order.
 */
export function typeChar(char: string, obstacles: readonly SymbolObstacle[]): TypeResult {
  const active = activeWord(obstacles)

  // 1. The active word gets the key first. It needs no visibility check: it
  // was visible when it started and only moves left in a fixed view.
  if (active && matchesSymbol(char, nextChar(active))) {
    if (active.typed + 1 === active.symbol.length) {
      return { kind: 'destroyed', obstacle: active, obstacles: obstacles.filter((o) => o !== active) }
    }
    return {
      kind: 'progress',
      obstacles: obstacles.map((o) => (o === active ? { ...o, typed: o.typed + 1 } : o)),
    }
  }

  // 2. The nearest other match. While a word is active, a farther word can not take over.
  let match: SymbolObstacle | null = null
  for (const obstacle of visibleObstacles(obstacles)) {
    if (obstacle === active) continue
    if (active && isWord(obstacle.symbol) && obstacle.x >= active.x) continue
    if (!matchesSymbol(char, nextChar(obstacle))) continue
    if (!match || obstacle.x < match.x) match = obstacle
  }
  if (!match) return { kind: 'miss' }

  const chosen = match
  if (!isWord(chosen.symbol)) {
    return { kind: 'destroyed', obstacle: chosen, obstacles: obstacles.filter((o) => o !== chosen) }
  }
  return {
    kind: 'progress',
    obstacles: obstacles.map((o) => {
      if (o === chosen) return { ...o, typed: 1 }
      if (o === active) return { ...o, typed: 0 }
      return o
    }),
  }
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

/**
 * Score: the same distance score as Classic, plus COIN_VALUE for every
 * character of a destroyed bug (a single adds 10, `function` adds 80).
 */
export function syntaxScore(elapsedTime: number, destroyedLetters: number): number {
  return calculateScore(elapsedTime) + destroyedLetters * COIN_VALUE
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
