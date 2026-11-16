import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from './gameStore'

const initialState = useGameStore.getState()

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(initialState, true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts on the menu with a zero score', () => {
    const { status, score, bestScore } = useGameStore.getState()
    expect(status).toBe('menu')
    expect(score).toBe(0)
    expect(bestScore).toBe(0)
  })

  it('startGame() switches to playing and resets the score', () => {
    useGameStore.setState({ score: 42 })

    useGameStore.getState().startGame()

    const { status, score } = useGameStore.getState()
    expect(status).toBe('playing')
    expect(score).toBe(0)
  })

  it('setScore() updates the live score without changing the status or best score', () => {
    useGameStore.getState().startGame()

    useGameStore.getState().setScore(37)

    const { status, score, bestScore } = useGameStore.getState()
    expect(status).toBe('playing')
    expect(score).toBe(37)
    expect(bestScore).toBe(0)
  })

  it('endGame() switches to gameover and records the final score', () => {
    useGameStore.getState().startGame()

    useGameStore.getState().endGame(120)

    const { status, score, bestScore } = useGameStore.getState()
    expect(status).toBe('gameover')
    expect(score).toBe(120)
    expect(bestScore).toBe(120)
  })

  it('endGame() keeps the best score when a later run scores lower', () => {
    useGameStore.getState().endGame(120)
    useGameStore.getState().startGame()

    useGameStore.getState().endGame(50)

    const { score, bestScore } = useGameStore.getState()
    expect(score).toBe(50)
    expect(bestScore).toBe(120)
  })

  it('resetToMenu() returns to the menu and keeps the best score', () => {
    useGameStore.getState().endGame(120)

    useGameStore.getState().resetToMenu()

    const { status, score, bestScore } = useGameStore.getState()
    expect(status).toBe('menu')
    expect(score).toBe(0)
    expect(bestScore).toBe(120)
  })

  it('pauseGame() and resumeGame() switch between playing and paused, keeping the score', () => {
    useGameStore.getState().startGame()
    useGameStore.getState().setScore(37)

    useGameStore.getState().pauseGame()
    expect(useGameStore.getState().status).toBe('paused')

    useGameStore.getState().resumeGame()
    expect(useGameStore.getState().status).toBe('playing')
    expect(useGameStore.getState().score).toBe(37)
  })

  it('pauseGame() and resumeGame() do nothing outside a run', () => {
    useGameStore.getState().pauseGame()
    expect(useGameStore.getState().status).toBe('menu')

    useGameStore.getState().endGame(10)
    useGameStore.getState().resumeGame()
    expect(useGameStore.getState().status).toBe('gameover')
  })

  it('endGame() saves a new best score, and leaves storage alone otherwise', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem })

    useGameStore.getState().endGame(120)
    expect(setItem).toHaveBeenCalledWith('livecode-game-bestscore', '120')

    useGameStore.getState().endGame(50)
    useGameStore.getState().endGame(120)
    expect(setItem).toHaveBeenCalledTimes(1)
  })
})

describe('gameStore best score persistence', () => {
  const KEY = 'livecode-game-bestscore'

  /** A Map backed stand-in for localStorage, with a spy on every write. */
  function stubStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial))
    const setItem = vi.fn((key: string, value: string) => void data.set(key, value))
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem })
    return { data, setItem }
  }

  /** Loads a brand new copy of the store, the way a page reload would. */
  async function loadFreshStore() {
    vi.resetModules()
    const { useGameStore: freshStore } = await import('./gameStore')
    return freshStore
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the saved best score when the store is created', async () => {
    stubStorage({ [KEY]: '128' })

    const store = await loadFreshStore()

    expect(store.getState().bestScore).toBe(128)
  })

  it('starts with a best score of 0 when nothing is saved', async () => {
    stubStorage()

    const store = await loadFreshStore()

    expect(store.getState().bestScore).toBe(0)
  })

  it('starts with a best score of 0 when the saved value is corrupted', async () => {
    stubStorage({ [KEY]: 'not-a-number' })

    const store = await loadFreshStore()

    expect(store.getState().bestScore).toBe(0)
  })

  it('does not write to storage just by being created', async () => {
    const { setItem } = stubStorage({ [KEY]: '128' })

    await loadFreshStore()

    expect(setItem).not.toHaveBeenCalled()
  })

  it('saves a score that beats the saved best', async () => {
    const { data, setItem } = stubStorage({ [KEY]: '128' })
    const store = await loadFreshStore()

    store.getState().endGame(200)

    expect(setItem).toHaveBeenCalledExactlyOnceWith(KEY, '200')
    expect(data.get(KEY)).toBe('200')
    expect(store.getState().bestScore).toBe(200)
  })

  it('never lowers the saved best when a run scores lower', async () => {
    const { data, setItem } = stubStorage({ [KEY]: '128' })
    const store = await loadFreshStore()

    store.getState().endGame(64)

    expect(setItem).not.toHaveBeenCalled()
    expect(data.get(KEY)).toBe('128')
    expect(store.getState().bestScore).toBe(128)
  })

  it('does not write again when a run only ties the best', async () => {
    const { setItem } = stubStorage({ [KEY]: '128' })
    const store = await loadFreshStore()

    store.getState().endGame(128)

    expect(setItem).not.toHaveBeenCalled()
    expect(store.getState().bestScore).toBe(128)
  })

  it('does not save a first run that scores 0', async () => {
    const { setItem } = stubStorage()
    const store = await loadFreshStore()

    store.getState().endGame(0)

    expect(setItem).not.toHaveBeenCalled()
  })

  it('writes only on the runs that set a new record across several runs', async () => {
    const { setItem } = stubStorage()
    const store = await loadFreshStore()

    for (const finalScore of [50, 30, 80, 80, 79, 120]) {
      store.getState().startGame()
      store.getState().endGame(finalScore)
    }

    expect(setItem.mock.calls.map(([, value]) => value)).toEqual(['50', '80', '120'])
    expect(store.getState().bestScore).toBe(120)
  })

  it('leaves the saved best alone when starting, pausing, scoring or returning to the menu', async () => {
    const { setItem } = stubStorage({ [KEY]: '128' })
    const store = await loadFreshStore()

    store.getState().startGame()
    store.getState().setScore(500)
    store.getState().pauseGame()
    store.getState().resumeGame()
    store.getState().resetToMenu()

    expect(setItem).not.toHaveBeenCalled()
    expect(store.getState().bestScore).toBe(128)
  })

  it('a new best is still there after a reload', async () => {
    stubStorage()
    const firstVisit = await loadFreshStore()
    firstVisit.getState().endGame(310)

    const secondVisit = await loadFreshStore()

    expect(secondVisit.getState().bestScore).toBe(310)
  })

  it('keeps the new best in memory when storage refuses the write', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('storage is full')
      },
    })
    const store = await loadFreshStore()

    expect(() => store.getState().endGame(90)).not.toThrow()

    expect(store.getState().status).toBe('gameover')
    expect(store.getState().bestScore).toBe(90)
  })
})
