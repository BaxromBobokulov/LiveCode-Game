import { create } from 'zustand'
import type { GameStatus } from '../engine/types'
import { getBestScore, setBestScore } from '../lib/storage'
import type { GameMode, TypingStats } from '../engine/types'
import { getSyntaxBestScore, setSyntaxBestScore } from '../lib/storage'
import { SYNTAX_LIVES } from '../constants/game'

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

  // --- Syntax Rush (spec 0002) ---
  // `mode` is only read while status is playing, paused or gameover.
  // resetToMenu leaves these as they are; the next start overwrites them.
  mode: GameMode
  syntaxBestScore: number
  /** Lives left in the current Syntax Rush run. */
  lives: number
  /** Bugs destroyed in a row in the current Syntax Rush run. */
  combo: number
  /** WPM and accuracy of the last finished Syntax Rush run. */
  lastStats: TypingStats | null
  startSyntaxGame: () => void
  /** Updates lives. Does nothing if the value is unchanged. */
  setLives: (lives: number) => void
  /** Updates the combo. Does nothing if unchanged, so mashing wrong keys at 0 notifies nobody. */
  setCombo: (combo: number) => void
  endSyntaxGame: (finalScore: number, stats: TypingStats) => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  status: 'menu',
  score: 0,
  // Read once, when the store is created, so the menu shows it right away.
  bestScore: getBestScore(),

  startGame: () => set({ status: 'playing', score: 0, mode: 'classic' }),

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

  // --- Syntax Rush (spec 0002) ---
  mode: 'classic',
  syntaxBestScore: getSyntaxBestScore(),
  lives: SYNTAX_LIVES,
  combo: 0,
  lastStats: null,

  // One set call, so no render ever sees 'playing' together with the old mode.
  startSyntaxGame: () =>
    set({ status: 'playing', mode: 'syntax', score: 0, lives: SYNTAX_LIVES, combo: 0, lastStats: null }),

  setLives: (lives) => {
    if (get().lives !== lives) set({ lives })
  },

  setCombo: (combo) => {
    if (get().combo !== combo) set({ combo })
  },

  endSyntaxGame: (finalScore, stats) => {
    const isNewBest = finalScore > get().syntaxBestScore
    if (isNewBest) setSyntaxBestScore(finalScore)
    set({
      status: 'gameover',
      score: finalScore,
      lastStats: stats,
      ...(isNewBest && { syntaxBestScore: finalScore }),
    })
  },
}))
