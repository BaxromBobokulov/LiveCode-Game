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
  WORD_CHANCE_TIER_1,
  WORD_CHANCE_TIER_2,
  SYNTAX_SYMBOLS_TIER_1,
  SYNTAX_SYMBOLS_TIER_2,
  SYNTAX_VIEW_WIDTH,
  SYNTAX_WORDS_TIER_1,
  SYNTAX_WORDS_TIER_2,
  WORD_LETTER_TIME,
} from '../constants/game'
import {
  activeWord,
  advanceSymbolObstacles,
  classifyKey,
  codeSymbols,
  findTarget,
  graceSpeedFactor,
  letterChance,
  lockTarget,
  matchesSymbol,
  meetsSyntaxGate,
  obstacleSpeed,
  pickSpawn,
  pickSymbol,
  pickSyntaxSpawnInterval,
  pickWord,
  spawnGapAfter,
  spawnSymbolObstacle,
  syntaxScore,
  syntaxSpeed,
  syntaxViewScale,
  typeChar,
  typingStats,
  visibleObstacles,
  wordChance,
  wordLabelWidth,
  wordPool,
  wordSpeedCap,
  wordVisibleDistance,
} from './syntaxRush'
import type { KeyInput, SymbolObstacle, TypeResult } from './types'

/** A random that returns the given values in order, then repeats the last one. */
function sequence(...values: number[]) {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

/** A visible bug at x with the given character (or word), `typed` letters already typed. */
function bug(id: number, x: number, symbol: string, typed = 0): SymbolObstacle {
  return { id, x, y: 0, width: 100, height: 84, symbol, typed }
}

/** The id typeChar destroyed, or null when it destroyed nothing. */
function destroyedId(result: TypeResult) {
  return result.kind === 'destroyed' ? result.obstacle.id : null
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
    expect(destroyedId(typeChar('k', bugs))).toBe(2)
    expect(destroyedId(typeChar(';', bugs))).toBe(1)
  })

  it('picks the nearer bug when two show the same character', () => {
    expect(destroyedId(typeChar(';', [bug(1, 900, ';'), bug(2, 400, ';')]))).toBe(2)
  })

  it('cannot destroy a bug that is not fully on screen, and a wrong key is a miss', () => {
    expect(typeChar('a', [bug(1, offscreen, 'a')])).toEqual({ kind: 'miss' })
    expect(typeChar('z', [bug(1, 500, 'a')])).toEqual({ kind: 'miss' })
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
    expect(spawned).toEqual({ id: 7, symbol: 'k', typed: 0, x: SYNTAX_VIEW_WIDTH, y: 600 - 84, width: 100, height: 84 })

    // 0.1 s at the starting speed.
    const [moved] = advanceSymbolObstacles([spawned], 0, 0.1, 650)
    expect(moved).toEqual({ ...spawned, x: SYNTAX_VIEW_WIDTH - SYNTAX_BASE_SPEED * 0.1, y: 650 - 84 })
    expect(advanceSymbolObstacles([bug(1, -99, 'a')], 0, 1, 600)).toEqual([])
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

// --- Word obstacles (spec 0003) ---

describe('word lists', () => {
  it('uses 2 to 8 lowercase letters, with no word in both tiers', () => {
    const all = [...SYNTAX_WORDS_TIER_1, ...SYNTAX_WORDS_TIER_2]
    for (const word of all) expect(word).toMatch(/^[a-z]{2,8}$/)
    expect(new Set(all).size).toBe(all.length)
  })

  it('gives each tier at least two first letters, so pickWord always has a choice', () => {
    for (const tier of [SYNTAX_WORDS_TIER_1, SYNTAX_WORDS_TIER_2]) {
      expect(new Set(tier.map((word) => word[0])).size).toBeGreaterThanOrEqual(2)
    }
  })

  it('unlocks the long words and a higher word chance at a full score of 200', () => {
    expect(wordPool(199)).toHaveLength(10)
    expect(wordPool(200)).toHaveLength(18)
    expect(wordChance(199)).toBe(WORD_CHANCE_TIER_1)
    expect(wordChance(200)).toBe(WORD_CHANCE_TIER_2)
    expect(WORD_CHANCE_TIER_2).toBeGreaterThan(WORD_CHANCE_TIER_1)
  })
})

describe('pickWord and pickSpawn', () => {
  it('never returns the last word', () => {
    for (const pick of [0, 0.5, 0.999]) {
      for (const lastWord of wordPool(200)) {
        expect(pickWord(200, lastWord, [], () => pick)).not.toBe(lastWord)
      }
    }
  })

  it('skips words that start like a word on screen, even one not yet visible', () => {
    const onScreen = [bug(1, SYNTAX_VIEW_WIDTH, 'let')] // just spawned, not visible yet
    for (const pick of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(pickWord(0, null, onScreen, () => pick)[0]).not.toBe('l')
    }
  })

  it('ignores single characters on screen', () => {
    // Tier 1 starts with 'if'; a single 'i' does not block it.
    expect(pickWord(0, null, [bug(1, 500, 'i')], () => 0)).toBe('if')
  })

  it('falls back to "not the last word" when every first letter is taken', () => {
    const onScreen = SYNTAX_WORDS_TIER_1.map((word, i) => bug(i, 500, word))
    expect(pickWord(0, 'if', onScreen, () => 0)).toBe('for')
  })

  it('rolls word or single first', () => {
    expect(pickSpawn(0, null, null, [], sequence(0.1, 0))).toBe('if')
    expect(pickSpawn(0, null, null, [], sequence(0.5, 0.1, 0))).toBe('a')
  })

  it('still never repeats the last single, even with a word spawned in between', () => {
    expect(pickSpawn(0, 'a', 'if', [], sequence(0.5, 0.1, 0))).toBe('b')
  })
})

describe('spawn gaps', () => {
  it('adds extra time per letter only after a word', () => {
    expect(spawnGapAfter('k', () => 0)).toBe(SYNTAX_SPAWN_INTERVAL_MIN)
    expect(spawnGapAfter('return', () => 0)).toBeCloseTo(SYNTAX_SPAWN_INTERVAL_MIN + 6 * 0.3)
  })
})

describe('word speed and fairness', () => {
  it('moves single characters with the world and words slower', () => {
    expect(obstacleSpeed('k', 10)).toBe(syntaxSpeed(10))
    expect(obstacleSpeed('if', 0)).toBe(SYNTAX_BASE_SPEED * 0.5)
    expect(obstacleSpeed('function', 1000)).toBe(wordSpeedCap(8))
  })

  it('keeps every word fully visible for 1.0 s plus 0.4 s per letter at top speed', () => {
    for (const word of [...SYNTAX_WORDS_TIER_1, ...SYNTAX_WORDS_TIER_2]) {
      const visibleTime = wordVisibleDistance(word.length) / obstacleSpeed(word, Infinity)
      expect(visibleTime).toBeGreaterThanOrEqual(SYNTAX_MIN_VISIBLE_TIME + word.length * WORD_LETTER_TIME - 1e-9)
    }
  })

  it('matches the spec numbers for tile width and visible distance', () => {
    expect(wordLabelWidth(2)).toBe(60)
    expect(wordLabelWidth(8)).toBe(168)
    expect(wordVisibleDistance(2)).toBe(924)
    expect(wordVisibleDistance(8)).toBe(890)
  })

  it('moves a single and a word by different distances, keeping typed', () => {
    const [single, word] = advanceSymbolObstacles([bug(1, 800, 'k'), bug(2, 800, 'while', 2)], 0, 1, 84)
    expect(single.x).toBe(800 - SYNTAX_BASE_SPEED)
    expect(word.x).toBe(800 - SYNTAX_BASE_SPEED * 0.5)
    expect(word.typed).toBe(2)
  })
})

describe('word visibility', () => {
  it('needs the whole word tile inside the view, not just the bug', () => {
    // Bug fully inside (1280 - 110 = 1170 + 100 = 1270), but the 168 px tile reaches 1304.
    const x = SYNTAX_VIEW_WIDTH - 110
    expect(visibleObstacles([bug(1, x, 'function')])).toEqual([])
    expect(visibleObstacles([bug(2, x, 'k')])).toHaveLength(1)
  })
})

describe('typeChar with words', () => {
  /** Types each character in turn and returns every result. */
  function typeAll(chars: string, start: SymbolObstacle[]) {
    let obstacles = start
    const results: TypeResult[] = []
    for (const char of chars) {
      const result = typeChar(char, obstacles)
      results.push(result)
      if (result.kind !== 'miss') obstacles = result.obstacles
    }
    return results
  }

  it('types a word letter by letter and destroys it on the last letter', () => {
    const results = typeAll('while', [bug(1, 600, 'while')])
    expect(results.slice(0, 4).map((r) => r.kind)).toEqual(['progress', 'progress', 'progress', 'progress'])
    const last = results[4]
    expect(last.kind).toBe('destroyed')
    if (last.kind === 'destroyed') {
      expect(last.obstacle.id).toBe(1)
      expect(last.obstacles).toEqual([])
    }
  })

  it('gives the key to the active word before a nearer single with the same letter', () => {
    const result = typeChar('e', [bug(1, 300, 'e'), bug(2, 600, 'let', 1)])
    expect(result.kind).toBe('progress')
    if (result.kind === 'progress') expect(result.obstacles.map((o) => o.typed)).toEqual([0, 2])
  })

  it('destroys a single while a word is active, keeping the word progress', () => {
    const result = typeChar('k', [bug(1, 300, 'k'), bug(2, 600, 'return', 2)])
    expect(destroyedId(result)).toBe(1)
    if (result.kind === 'destroyed') expect(result.obstacles).toEqual([bug(2, 600, 'return', 2)])
  })

  it('switches to a nearer word, and the old word starts over', () => {
    // 'string' at 2 typed waits for 'r', so 'i' can only go to 'if'.
    const result = typeChar('i', [bug(1, 700, 'string', 2), bug(2, 400, 'if')])
    expect(result.kind).toBe('progress')
    if (result.kind === 'progress') expect(result.obstacles.map((o) => o.typed)).toEqual([0, 1])
  })

  it('never switches to a farther word', () => {
    expect(typeChar('i', [bug(1, 400, 'string', 2), bug(2, 900, 'if')])).toEqual({ kind: 'miss' })
  })

  it('keeps progress on a wrong key', () => {
    const start = [bug(1, 600, 'const', 2)]
    expect(typeChar('z', start)).toEqual({ kind: 'miss' })
    expect(start).toEqual([bug(1, 600, 'const', 2)])
  })

  it('matches word letters in either case and from a non Latin layout', () => {
    expect(typeChar('W', [bug(1, 600, 'while')]).kind).toBe('progress')
    const cyrillic = classifyKey(key({ key: 'ц', code: 'KeyW' }))
    if (cyrillic.kind !== 'typed') throw new Error('expected a typed key')
    expect(typeChar(cyrillic.char, [bug(1, 600, 'while')]).kind).toBe('progress')
  })

  it('breaks a tie in list order', () => {
    expect(destroyedId(typeChar('k', [bug(1, 500, 'k'), bug(2, 500, 'k')]))).toBe(1)
  })

  it('never changes its input and keeps list order', () => {
    const start = [bug(1, 800, 'if'), bug(2, 300, 'k'), bug(3, 900, 'else', 1)]
    const copy = structuredClone(start)
    const result = typeChar('i', start)
    expect(start).toEqual(copy)
    expect(result.kind).toBe('progress')
    if (result.kind === 'progress') {
      expect(result.obstacles.map((o) => o.id)).toEqual([1, 2, 3])
      expect(result.obstacles.map((o) => o.typed)).toEqual([1, 0, 0])
    }
  })

  it('locks the active word even when a single is nearer, else the nearest bug', () => {
    expect(lockTarget([bug(1, 300, 'k'), bug(2, 600, 'loop', 1)])?.id).toBe(2)
    expect(lockTarget([bug(1, 300, 'k'), bug(2, 600, 'loop')])?.id).toBe(1)
  })

  it('keeps at most one active word and typed in range over a long key sequence', () => {
    // A small seeded random (linear congruential), so the run is the same every time.
    let seed = 42
    const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
    let obstacles = [
      bug(1, 300, 'k'),
      bug(2, 400, 'if'),
      bug(3, 500, 'let'),
      bug(4, 600, 'while'),
      bug(5, 700, 'e'),
      bug(6, 800, 'function'),
    ]
    const letters = 'ifletwhilekfunctionaz'
    for (let i = 0; i < 50; i++) {
      const result = typeChar(letters[Math.floor(random() * letters.length)], obstacles)
      if (result.kind !== 'miss') obstacles = result.obstacles
      expect(obstacles.filter((o) => o.typed > 0).length).toBeLessThanOrEqual(1)
      for (const o of obstacles) {
        expect(o.typed).toBeGreaterThanOrEqual(0)
        expect(o.typed).toBeLessThan(o.symbol.length)
      }
      expect(activeWord(obstacles)).toBe(obstacles.find((o) => o.typed > 0) ?? null)
    }
  })
})

describe('word score', () => {
  it('adds 10 points per letter of a destroyed word', () => {
    expect(syntaxScore(10, 8)).toBe(180)
    expect(syntaxScore(0, 8)).toBe(80)
  })
})
