import { create } from 'zustand'
import type { GameStatus } from '../engine/types'

type GameStore = {
  status: GameStatus
  score: number
  bestScore: number
  startGame: () => void
  /** Updates the live score during a run. Called when a point is gained, not every frame. */
  setScore: (score: number) => void
  endGame: (finalScore: number) => void
  resetToMenu: () => void
}

export const useGameStore = create<GameStore>()((set) => ({
  status: 'menu',
  score: 0,
  bestScore: 0,

  startGame: () => set({ status: 'playing', score: 0 }),

  setScore: (score) => set({ score }),

  endGame: (finalScore) =>
    set((state) => ({
      status: 'gameover',
      score: finalScore,
      // TODO: persist bestScore to localStorage
      bestScore: Math.max(state.bestScore, finalScore),
    })),

  resetToMenu: () => set({ status: 'menu', score: 0 }),
}))
