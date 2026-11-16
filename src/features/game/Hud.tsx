import { Button } from '../../components/Button'
import { ArrowLeftIcon, PauseIcon, PlayIcon, TrophyIcon } from '../../components/icons'
import { useGameStore } from '../../store/gameStore'

// The score changes about 10 times a second. Each piece below subscribes only
// to the one value it shows, so a score change re-renders <CurrentScore /> (a
// single number) and nothing else: not the best score, not the pause button,
// and not the canvas.

function CurrentScore() {
  const score = useGameStore((state) => state.score)
  return <>{score}</>
}

function BestScore() {
  const bestScore = useGameStore((state) => state.bestScore)
  return <>{bestScore}</>
}

function Stat({ label, iconClass, children }: { label: string; iconClass: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <TrophyIcon className={`size-7 ${iconClass}`} />
      <div className="leading-tight">
        <p className="text-xs font-medium text-muted">{label}</p>
        {/* tabular-nums keeps every digit the same width, so the bar does not wobble as the score climbs. */}
        <p className="text-xl font-bold text-ink tabular-nums">{children}</p>
      </div>
    </div>
  )
}

function PauseToggle() {
  const isPaused = useGameStore((state) => state.status === 'paused')
  const pauseGame = useGameStore((state) => state.pauseGame)
  const resumeGame = useGameStore((state) => state.resumeGame)

  return (
    <button
      type="button"
      aria-label={isPaused ? 'Resume game' : 'Pause game'}
      onClick={(event) => {
        // Give keyboard focus back to the page, so the next Space press is a
        // jump and not a second press of this button.
        event.currentTarget.blur()
        if (isPaused) resumeGame()
        else pauseGame()
      }}
      className="pointer-events-auto flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {isPaused ? <PlayIcon /> : <PauseIcon />}
    </button>
  )
}

function PausedOverlay() {
  const isPaused = useGameStore((state) => state.status === 'paused')
  const resumeGame = useGameStore((state) => state.resumeGame)
  const resetToMenu = useGameStore((state) => state.resetToMenu)
  if (!isPaused) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paused-title"
      className="absolute inset-0 flex items-center justify-center bg-canvas/75 p-6 backdrop-blur-xs"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-6 rounded-3xl border border-line bg-surface p-8 text-center">
        <h2 id="paused-title" className="text-3xl font-extrabold text-ink italic">
          Paused
        </h2>
        <div className="flex w-full flex-col gap-3">
          <Button autoFocus onClick={resumeGame}>
            <PlayIcon />
            Resume
          </Button>
          {/* Leaving the run throws it away: the canvas unmounts on 'menu',
              so the next Play starts from a clean scene and a score of 0. */}
          <Button variant="secondary" onClick={resetToMenu}>
            <ArrowLeftIcon className="size-4" />
            Quit to Menu
          </Button>
        </div>
        <p className="text-sm text-muted">You can also press Esc or P</p>
      </div>
    </div>
  )
}

/**
 * Score bar and pause controls, drawn as normal HTML on top of the canvas.
 * The bar lets taps fall through to the canvas (so tapping near the top still
 * jumps); only the pause button itself catches them.
 */
export function Hud() {
  return (
    <>
      <PausedOverlay />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4 sm:px-6">
        <div className="flex items-center gap-5">
          <Stat label="Score" iconClass="text-gold">
            <CurrentScore />
          </Stat>
          <div aria-hidden className="h-9 w-px bg-line" />
          <Stat label="Best" iconClass="text-gold/70">
            <BestScore />
          </Stat>
        </div>
        <PauseToggle />
      </div>
    </>
  )
}
