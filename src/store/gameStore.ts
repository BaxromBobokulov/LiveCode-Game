import { create } from 'zustand'
import type { GameStatus } from '../engine/types'
import { getBestScore, setBestScore } from '../lib/storage'

type GameStore = {
  status: GameStatus
  score: number
  bestScore: number
  startGame: () => void
  /** Updates the live score during a run. Called when a point is gained, not every frame. */
  setScore: (score: number) => void
  /** Freezes a run in place. Does nothing unless a run is playing. */
  pauseGame: () => void
  /** Continues a paused run from where it stopped. Does nothing unless paused. */
  resumeGame: () => void
  endGame: (finalScore: number) => void
  resetToMenu: () => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  status: 'menu',
  score: 0,
  // Read once, when the store is created, so the menu shows it right away.
  bestScore: getBestScore(),

  startGame: () => set({ status: 'playing', score: 0 }),

  setScore: (score) => set({ score }),

  pauseGame: () => {
    if (get().status === 'playing') set({ status: 'paused' })
  },

  resumeGame: () => {
    if (get().status === 'paused') set({ status: 'playing' })
  },

  endGame: (finalScore) => {
    const isNewBest = finalScore > get().bestScore
    // Only write to storage when the record is actually beaten.
    if (isNewBest) setBestScore(finalScore)
    set({
      status: 'gameover',
      score: finalScore,
      ...(isNewBest && { bestScore: finalScore }),
    })
  },

  resetToMenu: () => set({ status: 'menu', score: 0 }),
}))
