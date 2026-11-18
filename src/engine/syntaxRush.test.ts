import { describe, expect, it } from 'vitest'
import {
  MASCOT_SIZE,
  MASCOT_X,
  OBSTACLE_SIZES,
  SYNTAX_BASE_SPEED,
  SYNTAX_LETTERS,
  SYNTAX_MAX_SPEED,
  SYNTAX_MIN_VISIBLE_TIME,
  SYNTAX_SPAWN_INTERVAL_MAX,
  SYNTAX_SPAWN_INTERVAL_MIN,
  SYNTAX_SYMBOLS_TIER_1,
  SYNTAX_SYMBOLS_TIER_2,
  SYNTAX_VIEW_WIDTH,
} from '../constants/game'
import {
  advanceSymbolObstacles,
  classifyKey,
  codeSymbols,
  findTarget,
  graceSpeedFactor,
  letterChance,
  matchesSymbol,
  meetsSyntaxGate,
  pickSymbol,
  pickSyntaxSpawnInterval,
  resolveKey,
  spawnSymbolObstacle,
  syntaxScore,
  syntaxSpeed,
  syntaxViewScale,
  typingStats,
  visibleObstacles,
} from './syntaxRush'
import type { KeyInput, SymbolObstacle } from './types'

/** A random that returns the given values in order, then repeats the last one. */
function sequence(...values: number[]) {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

/** A visible bug at x with the given character. */
function bug(id: number, x: number, symbol: string): SymbolObstacle {
  return { id, x, y: 0, width: 100, height: 84, symbol }
}

/** A plain key press; override only what a test cares about. */
function key(overrides: Partial<KeyInput>): KeyInput {
  return {
    key: 'a',
    code: 'KeyA',
    repeat: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    isComposing: false,
    ...overrides,
  }
}

describe('character pools', () => {
  it('unlocks tier 2 code symbols at a full score of 200', () => {
    expect(codeSymbols(199)).toHaveLength(6)
    expect(codeSymbols(200)).toHaveLength(12)
  })

  it('mixes more letters early and an even mix in tier 2', () => {
    expect(letterChance(199)).toBe(0.75)
    expect(letterChance(200)).toBe(0.5)
  })

  it('uses single printable ASCII characters only, with no quotes, and no character in two pools', () => {
    const all = [...SYNTAX_LETTERS, ...SYNTAX_SYMBOLS_TIER_1, ...SYNTAX_SYMBOLS_TIER_2]
    for (const char of all) {
      expect(char).toMatch(/^[\x21-\x7e]$/)
      expect(['"', "'", '`']).not.toContain(char)
    }
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('pickSymbol', () => {
  it('rolls the letter pool first, then picks inside it', () => {
    expect(pickSymbol(0, null, sequence(0.1, 0))).toBe('a')
    expect(pickSymbol(0, 'a', sequence(0.1, 0))).toBe('b')
  })

  it('picks a tier 1 code symbol when the roll misses the letter chance', () => {
    expect(pickSymbol(0, null, sequence(0.9, 0))).toBe(';')
    expect(pickSymbol(0, ';', sequence(0.9, 0))).toBe('=')
  })

  it('can pick a tier 2 symbol once unlocked', () => {
    expect(pickSymbol(200, null, sequence(0.9, 0.99))).toBe('+')
  })

  it('never repeats the previous character, in either pool and either tier', () => {
    for (const score of [0, 200]) {
      for (const previous of [...SYNTAX_LETTERS, ...codeSymbols(score)]) {
        for (const roll of [0, 0.6, 0.8, 0.99]) {
          for (const pick of [0, 0.5, 0.999]) {
            expect(pickSymbol(score, previous, sequence(roll, pick))).not.toBe(previous)
          }
        }
      }
    }
  })
})

describe('classifyKey', () => {
  it('ignores named keys, modifiers, composition and Escape', () => {
    for (const input of [
      key({ key: 'Shift' }),
      key({ key: 'Enter' }),
      key({ key: 'Tab' }),
      key({ key: 'Dead' }),
      key({ key: 'Process' }),
      key({ key: 'a', isComposing: true }),
      key({ key: 'c', ctrlKey: true }),
      key({ key: 'v', metaKey: true }),
      key({ key: 'Escape' }),
      key({ key: '😀' }),
    ]) {
      expect(classifyKey(input)).toEqual({ kind: 'ignore' })
    }
  })

  it('blocks Space and held down repeats without counting them', () => {
    expect(classifyKey(key({ key: ' ', code: 'Space' }))).toEqual({ kind: 'block' })
    expect(classifyKey(key({ key: 'k', repeat: true }))).toEqual({ kind: 'block' })
  })

  it('counts AltGr characters (Ctrl and Alt together)', () => {
    expect(classifyKey(key({ key: '{', code: 'Digit7', ctrlKey: true, altKey: true }))).toEqual({
      kind: 'typed',
      char: '{',
      nonLatin: false,
    })
  })

  it('maps a Cyrillic letter key to its Latin letter by physical key', () => {
    expect(classifyKey(key({ key: 'ф', code: 'KeyA' }))).toEqual({ kind: 'typed', char: 'a', nonLatin: true })
  })

  it('keeps a non Latin character on a non letter key as is', () => {
    expect(classifyKey(key({ key: 'ж', code: 'Semicolon' }))).toEqual({
      kind: 'typed',
      char: 'ж',
      nonLatin: true,
    })
  })
})

describe('matchesSymbol', () => {
  it('matches letters in either case and code symbols exactly', () => {
    expect(matchesSymbol('K', 'k')).toBe(true)
    expect(matchesSymbol('k', 'k')).toBe(true)
    expect(matchesSymbol('k', ';')).toBe(false)
    expect(matchesSymbol(':', ';')).toBe(false)
  })
})

describe('targeting', () => {
  const offscreen = SYNTAX_VIEW_WIDTH - 50 // the right part of the bug is still past the edge

  it('only counts bugs fully inside the play area as visible', () => {
    expect(visibleObstacles([bug(1, 500, 'a'), bug(2, offscreen, 'b')]).map((o) => o.id)).toEqual([1])
  })

  it('targets the visible bug nearest the mascot, or none', () => {
    expect(findTarget([bug(1, 800, 'a'), bug(2, 500, 'b')])?.id).toBe(2)
    expect(findTarget([bug(1, offscreen, 'a')])).toBeNull()
    expect(findTarget([])).toBeNull()
  })

  it('destroys the bug whose character was typed, even if it is not the target', () => {
    const bugs = [bug(1, 500, ';'), bug(2, 800, 'k')]
    expect(resolveKey('k', bugs)).toBe(2)
    expect(resolveKey(';', bugs)).toBe(1)
  })

  it('picks the nearer bug when two show the same character', () => {
    expect(resolveKey(';', [bug(1, 900, ';'), bug(2, 400, ';')])).toBe(2)
  })

  it('cannot destroy a bug that is not fully on screen, and a miss is null', () => {
    expect(resolveKey('a', [bug(1, offscreen, 'a')])).toBeNull()
    expect(resolveKey('z', [bug(1, 500, 'a')])).toBeNull()
  })
})

describe('speed, spawning and view', () => {
  it('starts at base speed, ramps up and caps', () => {
    expect(syntaxSpeed(0)).toBe(SYNTAX_BASE_SPEED)
    expect(syntaxSpeed(25)).toBeGreaterThan(SYNTAX_BASE_SPEED)
    expect(syntaxSpeed(25)).toBeLessThan(SYNTAX_MAX_SPEED)
    expect(syntaxSpeed(1000)).toBe(SYNTAX_MAX_SPEED)
  })

  it('picks spawn gaps inside the range', () => {
    expect(pickSyntaxSpawnInterval(() => 0)).toBe(SYNTAX_SPAWN_INTERVAL_MIN)
    expect(pickSyntaxSpawnInterval(() => 0.999)).toBeLessThan(SYNTAX_SPAWN_INTERVAL_MAX)
  })

  it('is fair at top speed: a bug is fully visible long enough before it reaches the mascot', () => {
    const travel = SYNTAX_VIEW_WIDTH - MASCOT_X - MASCOT_SIZE - OBSTACLE_SIZES[1].width
    expect(travel / SYNTAX_MAX_SPEED).toBeGreaterThanOrEqual(SYNTAX_MIN_VISIBLE_TIME)
  })

  it('scales the play area to the window width', () => {
    expect(syntaxViewScale(SYNTAX_VIEW_WIDTH)).toBe(1)
    expect(syntaxViewScale(640)).toBe(0.5)
  })

  it('allows only a fine pointer with hover on a wide enough window', () => {
    expect(meetsSyntaxGate(true, 1024)).toBe(true)
    expect(meetsSyntaxGate(true, 1023)).toBe(false)
    expect(meetsSyntaxGate(false, 1920)).toBe(false)
  })

  it('spawns a bug at the right edge on the ground, and scrolls it keeping id and symbol', () => {
    const spawned = spawnSymbolObstacle(7, 600, 'k')
    expect(spawned).toEqual({ id: 7, symbol: 'k', x: SYNTAX_VIEW_WIDTH, y: 600 - 84, width: 100, height: 84 })

    const [moved] = advanceSymbolObstacles([spawned], 30, 650)
    expect(moved).toEqual({ ...spawned, x: SYNTAX_VIEW_WIDTH - 30, y: 650 - 84 })
    expect(advanceSymbolObstacles([bug(1, -99, 'a')], 5, 600)).toEqual([])
  })
})

describe('grace, score and stats', () => {
  it('slows the world during grace and eases back over the last half second', () => {
    expect(graceSpeedFactor(0)).toBe(1)
    expect(graceSpeedFactor(-1)).toBe(1)
    expect(graceSpeedFactor(1.8)).toBe(0.5)
    expect(graceSpeedFactor(0.5)).toBe(0.5)
    expect(graceSpeedFactor(0.25)).toBe(0.75)
  })

  it('adds 10 points per destroyed bug to the distance score', () => {
    expect(syntaxScore(10, 3)).toBe(130)
  })

  it('works out WPM from correct keys and accuracy rounded down', () => {
    expect(typingStats(50, 0, 60)).toEqual({ wpm: 10, accuracy: 100 })
    expect(typingStats(9, 1, 60)).toEqual({ wpm: 2, accuracy: 90 })
    expect(typingStats(995, 5, 600).accuracy).toBe(99)
    expect(typingStats(0, 0, 30)).toEqual({ wpm: 0, accuracy: null })
    expect(typingStats(3, 0, 0.5).wpm).toBe(0)
  })
})
