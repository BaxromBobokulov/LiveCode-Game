import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { ArrowLeftIcon, PlayIcon } from '../../components/icons'
import { ScoreBadge } from '../../components/ScoreBadge'
import { useGameStore } from '../../store/gameStore'
import { MascotPlaceholder } from './MascotPlaceholder'
import { ScreenFrame } from './ScreenFrame'

/**
 * How long the buttons ignore input after the screen appears, in ms. Players
 * are often still mashing jump at the moment they die; without this, that last
 * tap or key press could restart the run before they have seen their score.
 */
const INPUT_LOCK_MS = 400

export function GameOverScreen() {
  const score = useGameStore((state) => state.score)
  const bestScore = useGameStore((state) => state.bestScore)
  const startGame = useGameStore((state) => state.startGame)
  const resetToMenu = useGameStore((state) => state.resetToMenu)

  const [inputReady, setInputReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setInputReady(true), INPUT_LOCK_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ScreenFrame>
      <h1 className="mt-6 -rotate-3 text-5xl leading-none font-extrabold tracking-tight italic">
        <span className="text-ink">Game </span>
        <span className="text-accent">Over!</span>
      </h1>

      <div className="flex flex-1 items-center justify-center py-8">
        <MascotPlaceholder mood="hit" />
      </div>

      <div className="mb-6 flex flex-col items-center gap-1">
        <p className="text-lg font-medium text-muted">Your Score</p>
        <p className="text-6xl leading-none font-extrabold text-ink tabular-nums">{score}</p>
        <div className="mt-2">
          <ScoreBadge label="Best" value={bestScore} />
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        {/* No autoFocus on purpose: a leftover Space or Enter press from the
            run must not land on a button. Tab still reaches both buttons. */}
        <Button onClick={() => inputReady && startGame()}>
          <PlayIcon />
          Play Again
        </Button>
        {/* No real LiveCode integration yet, so this returns to our own menu. */}
        <Button variant="secondary" onClick={() => inputReady && resetToMenu()}>
          <ArrowLeftIcon className="size-4" />
          Back to LiveCode
        </Button>
      </div>
    </ScreenFrame>
  )
}
