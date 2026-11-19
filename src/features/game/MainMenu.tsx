import { Button } from '../../components/Button'
import { PlayIcon } from '../../components/icons'
import { ScoreBadge } from '../../components/ScoreBadge'
import startMascot from '../../assets/start-mascot.webp'
import { useGameStore } from '../../store/gameStore'
import { ScreenFrame } from './ScreenFrame'
import { SYNTAX_GATE_NOTE, useCanPlaySyntaxRush } from './useCanPlaySyntaxRush'

const CLASSIC_HINT = 'Space, ↑ or tap to jump'
const SYNTAX_HINT = 'Type the letter, symbol or word on each bug. Esc pauses.'

/**
 * The main menu. Play (autofocused, so Space or Enter starts it) launches
 * Syntax Rush on a device that passes the keyboard gate, and Classic Runner
 * everywhere else. The other mode sits below as a secondary button.
 */
export function MainMenu() {
  const canPlaySyntax = useCanPlaySyntaxRush()

  return (
    <ScreenFrame>
      <p className="flex items-center gap-2 self-start text-base font-semibold text-ink">
        <span aria-hidden className="font-mono font-bold text-accent">
          {'</>'}
        </span>
        LiveCode
      </p>

      <h1 className="mt-10 -rotate-3 text-5xl leading-none font-extrabold tracking-tight italic">
        <span className="block text-ink">LiveCode</span>
        <span className="block text-accent">Runner</span>
      </h1>

      <div className="flex flex-1 items-center justify-center py-1">
        <img src={startMascot} alt="" className="h-auto max-h-[25dvh] w-auto" />
      </div>

      <div className="flex w-full flex-col gap-5">
        {canPlaySyntax ? (
          <>
            <SyntaxRushPlay />
            <ClassicOption />
          </>
        ) : (
          <>
            <ClassicPlay />
            <SyntaxRushOption />
          </>
        )}
      </div>
    </ScreenFrame>
  )
}

/** Play as Classic Runner: the default where Syntax Rush can't run. */
function ClassicPlay() {
  const bestScore = useGameStore((state) => state.bestScore)
  const startGame = useGameStore((state) => state.startGame)

  return (
    <>
      <Button autoFocus onClick={startGame}>
        <PlayIcon className="size-6" />
        Play
      </Button>
      <ScoreBadge label="High Score" value={bestScore} />
      <p className="text-sm text-muted">{CLASSIC_HINT}</p>
    </>
  )
}

/** Play as Syntax Rush: only rendered when the keyboard gate passes. */
function SyntaxRushPlay() {
  const best = useGameStore((state) => state.syntaxBestScore)
  const startSyntaxGame = useGameStore((state) => state.startSyntaxGame)

  return (
    <>
      <Button autoFocus onClick={startSyntaxGame}>
        <PlayIcon className="size-6" />
        Play
      </Button>
      <ScoreBadge label="Syntax Rush Best" value={best} />
      <p className="text-sm text-muted">{SYNTAX_HINT}</p>
    </>
  )
}

/** Classic Runner as the secondary choice, below a Syntax Rush Play. */
function ClassicOption() {
  const best = useGameStore((state) => state.bestScore)
  const startGame = useGameStore((state) => state.startGame)

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Button variant="secondary" aria-describedby="classic-note" onClick={startGame}>
        <PlayIcon className="size-5 text-accent" />
        Classic Runner
        <span className="text-sm font-medium text-muted">
          · Best <span className="font-bold text-gold tabular-nums">{best}</span>
        </span>
      </Button>
      <p id="classic-note" className="text-sm text-muted">
        {CLASSIC_HINT}
      </p>
    </div>
  )
}

/**
 * Syntax Rush as the secondary choice, shown where the gate fails. The button
 * stays visible but aria-disabled (still reachable by Tab and read out with its note).
 */
function SyntaxRushOption() {
  const best = useGameStore((state) => state.syntaxBestScore)

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Button
        variant="secondary"
        aria-disabled
        aria-describedby="syntax-rush-note"
        className="cursor-not-allowed opacity-50"
      >
        <span aria-hidden className="font-mono font-bold text-accent">
          {'{;}'}
        </span>
        Syntax Rush
        <span className="text-sm font-medium text-muted">
          · Best <span className="font-bold text-gold tabular-nums">{best}</span>
        </span>
      </Button>
      <p id="syntax-rush-note" className="text-sm text-muted">
        {SYNTAX_GATE_NOTE}
      </p>
    </div>
  )
}
