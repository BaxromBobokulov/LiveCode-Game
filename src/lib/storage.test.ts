import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBestScore, setBestScore } from './storage'
import { getSyntaxBestScore, setSyntaxBestScore } from './storage'

const KEY = 'livecode-game-bestscore'

/** A tiny stand-in for localStorage, since these tests run outside a browser. */
function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  })
  return data
}

describe('storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 0 when nothing is saved', () => {
    stubStorage()
    expect(getBestScore()).toBe(0)
  })

  it('returns the saved best score', () => {
    stubStorage({ [KEY]: '128' })
    expect(getBestScore()).toBe(128)
  })

  it.each(['abc', '', 'NaN', 'Infinity', '-5', '{"score":1}'])(
    'falls back to 0 for the corrupted value %j',
    (value) => {
      stubStorage({ [KEY]: value })
      expect(getBestScore()).toBe(0)
    },
  )

  it('returns 0 instead of throwing when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    expect(getBestScore()).toBe(0)
  })

  it('setBestScore() saves a value that getBestScore() reads back', () => {
    const data = stubStorage()
    setBestScore(250)
    expect(data.get(KEY)).toBe('250')
    expect(getBestScore()).toBe(250)
  })

  it('getBestScore() reflects the latest of several saves', () => {
    stubStorage()
    setBestScore(40)
    setBestScore(95)
    expect(getBestScore()).toBe(95)
  })

  it('setBestScore() writes only under the namespaced key', () => {
    const data = stubStorage()
    setBestScore(7)
    expect([...data.keys()]).toEqual([KEY])
  })

  it('reads a saved decimal as a whole number', () => {
    stubStorage({ [KEY]: '128.9' })
    expect(getBestScore()).toBe(128)
  })

  it('returns 0 when localStorage does not exist at all', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(getBestScore()).toBe(0)
    expect(() => setBestScore(5)).not.toThrow()
  })

  it('setBestScore() does not throw when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('full')
      },
    })
    expect(() => setBestScore(10)).not.toThrow()
  })
})

describe('Syntax Rush best score storage (spec 0002)', () => {
  const SYNTAX_KEY = 'livecode-game-bestscore-syntax'

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads 0 when nothing is saved or the value is corrupted', () => {
    stubStorage()
    expect(getSyntaxBestScore()).toBe(0)
    stubStorage({ [SYNTAX_KEY]: 'not-a-number' })
    expect(getSyntaxBestScore()).toBe(0)
  })

  it('saves and reads its own key, leaving the Classic key alone', () => {
    const data = stubStorage({ [KEY]: '128' })
    setSyntaxBestScore(70)
    expect(getSyntaxBestScore()).toBe(70)
    expect(data.get(KEY)).toBe('128')
    expect(getBestScore()).toBe(128)
  })

  it('never throws when storage is missing or blocked', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(getSyntaxBestScore()).toBe(0)
    expect(() => setSyntaxBestScore(5)).not.toThrow()
  })
})
