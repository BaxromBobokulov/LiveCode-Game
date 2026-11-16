import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'

const initialState = useGameStore.getState()

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(initialState, true)
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
})
