import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { ArrowLeftIcon, PlayIcon } from '../../components/icons'
import { ScoreBadge } from '../../components/ScoreBadge'
import gameOverMascot from '../../assets/game-over-mascot.webp'
import { useGameStore } from '../../store/gameStore'
import { ScreenFrame } from './ScreenFrame'
import { SYNTAX_GATE_NOTE, useCanPlaySyntaxRush } from './useCanPlaySyntaxRush'

/**
 * How long the buttons ignore input after the screen appears, in ms. Same rule
 * as the Classic Game Over screen: a key still being pressed when the run
 * ended must not restart it before the player has seen their score.
 */
const INPUT_LOCK_MS = 400

function TypingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-surface/60 px-5 py-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="text-2xl font-extrabold text-ink tabular-nums">{value}</span>
    </div>
  )
}

/** Game Over for Syntax Rush (spec 0002): score, best, WPM and accuracy. */
export function SyntaxRushGameOver() {
  const score = useGameStore((state) => state.score)
  const best = useGameStore((state) => state.syntaxBestScore)
  const stats = useGameStore((state) => state.lastStats)
  const startSyntaxGame = useGameStore((state) => state.startSyntaxGame)
  const resetToMenu = useGameStore((state) => state.resetToMenu)
  const canPlay = useCanPlaySyntaxRush()

  const [inputReady, setInputReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setInputReady(true), INPUT_LOCK_MS)
    return () => clearTimeout(timer)
  }, [])

  const wpm = stats ? String(stats.wpm) : '–'
  const accuracy = stats?.accuracy == null ? '–' : `${stats.accuracy}%`

  return (
    <ScreenFrame>
      <h1 className="-rotate-3 text-5xl leading-none font-extrabold tracking-tight italic">
        <span className="text-ink">Game </span>
        <span className="text-accent">Over!</span>
      </h1>

      <div className="flex flex-1 items-center justify-center">
        {/* Capped so score, stats and both buttons fit on a short laptop screen. */}
        <img src={gameOverMascot} alt="" className="max-h-[25dvh] w-auto" />
      </div>

      <div className="mb-6 flex flex-col items-center gap-1">
        <p className="text-lg font-medium text-muted">Your Score</p>
        <p className="text-6xl leading-none font-extrabold text-ink tabular-nums">{score}</p>
        <div className="mt-2">
          <ScoreBadge label="Best" value={best} />
        </div>
        <div className="mt-3 flex gap-3">
          <TypingStat label="WPM" value={wpm} />
          <TypingStat label="Accuracy" value={accuracy} />
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        {/* No autoFocus on purpose: a key still held from the run must not land on a button. */}
        <Button
          aria-disabled={!canPlay}
          aria-describedby={canPlay ? undefined : 'syntax-gameover-gate'}
          className={canPlay ? '' : 'cursor-not-allowed opacity-50'}
          onClick={() => inputReady && canPlay && startSyntaxGame()}
        >
          <PlayIcon />
          Play Again
        </Button>
        {!canPlay && (
          <p id="syntax-gameover-gate" className="text-sm text-muted">
            {SYNTAX_GATE_NOTE}
          </p>
        )}
        <Button variant="secondary" onClick={() => inputReady && resetToMenu()}>
          <ArrowLeftIcon className="size-4" />
          Back to LiveCode
        </Button>
      </div>
    </ScreenFrame>
  )
}
