const BEST_SCORE_KEY = 'livecode-game-bestscore'

/**
 * Reads the saved best score. Returns 0 when nothing is saved, when the saved
 * value is not a usable number, or when localStorage is not available at all
 * (private browsing, blocked storage, or a test running outside a browser).
 */
export function getBestScore(): number {
  try {
    const stored = Number(localStorage.getItem(BEST_SCORE_KEY))
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0
  } catch {
    return 0
  }
}

/** Saves the best score. A failed save is ignored: the game still works without it. */
export function setBestScore(score: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score))
  } catch {
    // Storage is full or blocked. The score stays in memory for this visit.
  }
}

// --- Syntax Rush (spec 0002) ---
// Its own key, so the Classic best score above is never touched by it.

const SYNTAX_BEST_SCORE_KEY = 'livecode-game-bestscore-syntax'

/** Reads the saved Syntax Rush best score. Same rules as getBestScore: never throws, bad values read as 0. */
export function getSyntaxBestScore(): number {
  try {
    const stored = Number(localStorage.getItem(SYNTAX_BEST_SCORE_KEY))
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0
  } catch {
    return 0
  }
}

/** Saves the Syntax Rush best score. A failed save is ignored. */
export function setSyntaxBestScore(score: number): void {
  try {
    localStorage.setItem(SYNTAX_BEST_SCORE_KEY, String(score))
  } catch {
    // Storage is full or blocked. The score stays in memory for this visit.
  }
}
