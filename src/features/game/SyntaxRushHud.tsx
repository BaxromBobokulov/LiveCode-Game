import { Button } from '../../components/Button'
import { ArrowLeftIcon, HeartIcon, PauseIcon, PlayIcon, TrophyIcon } from '../../components/icons'
import pauseMascot from '../../assets/pause-mascot.webp'
import { SYNTAX_LIVES } from '../../constants/game'
import { useGameStore } from '../../store/gameStore'

// The Syntax Rush HUD (spec 0002). Built like Hud.tsx: every value that
// changes during a run is its own tiny component with its own selector, so a
// score tick re-renders one number and nothing else.

function CurrentScore() {
  const score = useGameStore((state) => state.score)
  return <>{score}</>
}

function SyntaxBestScore() {
  const best = useGameStore((state) => state.syntaxBestScore)
  return <>{best}</>
}

function Stat({ label, iconClass, children }: { label: string; iconClass: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <TrophyIcon className={`size-7 ${iconClass}`} />
      <div className="leading-tight">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="text-xl font-bold text-ink tabular-nums">{children}</p>
      </div>
    </div>
  )
}

/** Hearts for the lives left. Lost lives stay as faded outlines, so the count does not rely on color alone. */
function Lives() {
  const lives = useGameStore((state) => state.lives)
  return (
    <div role="img" aria-label={`Lives: ${lives}`} className="flex items-center gap-1">
      {Array.from({ length: SYNTAX_LIVES }, (_, i) => (
        <HeartIcon key={i} className={`size-7 ${i < lives ? 'text-danger' : 'text-line'}`} />
      ))}
    </div>
  )
}

/** The current combo, for example "x7". Hidden at 0. Visual only: it does not change the score. */
function Combo() {
  const combo = useGameStore((state) => state.combo)
  if (combo === 0) return null
  return (
    <p className="text-2xl font-extrabold text-gold italic tabular-nums">
      x{combo}
      <span className="sr-only"> combo</span>
    </p>
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
        // Give focus back to the page, so typing never lands on this button.
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
      aria-labelledby="syntax-paused-title"
      className="absolute inset-0 flex items-center justify-center bg-canvas/75 p-6 backdrop-blur-xs"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-6 rounded-3xl border border-line bg-surface p-8 text-center">
        <h2 id="syntax-paused-title" className="text-3xl font-extrabold text-ink italic">
          Paused
        </h2>
        <div>
          <img src={pauseMascot} alt="" />
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button autoFocus onClick={resumeGame}>
            <PlayIcon />
            Resume
          </Button>
          {/* Quitting throws the run away; its score does not count. */}
          <Button variant="secondary" onClick={resetToMenu}>
            <ArrowLeftIcon className="size-4" />
            Quit to Menu
          </Button>
        </div>
        {/* P is a typing key in this mode, so only Esc pauses. */}
        <p className="text-sm text-muted">Press Esc to resume</p>
      </div>
    </div>
  )
}

/** Score bar, lives, combo and pause controls, drawn as HTML over the Syntax Rush canvas. */
export function SyntaxRushHud() {
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
            <SyntaxBestScore />
          </Stat>
          <div aria-hidden className="h-9 w-px bg-line" />
          <Lives />
          <Combo />
        </div>
        <PauseToggle />
      </div>
    </>
  )
}
