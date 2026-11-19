import { Button } from '../../components/Button'
import { PlayIcon } from '../../components/icons'
import { ScoreBadge } from '../../components/ScoreBadge'
import startMascot from '../../assets/start-mascot.webp'
import { useGameStore } from '../../store/gameStore'
import { ScreenFrame } from './ScreenFrame'
import { SYNTAX_GATE_NOTE, useCanPlaySyntaxRush } from './useCanPlaySyntaxRush'

/**
 * The Syntax Rush choice (spec 0002), placed after Classic's Play so Play
 * keeps the focus. On a device without a keyboard the button stays visible
 * but aria-disabled (still reachable by Tab and read out with its note).
 */
function SyntaxRushOption() {
  const best = useGameStore((state) => state.syntaxBestScore)
  const startSyntaxGame = useGameStore((state) => state.startSyntaxGame)
  const canPlay = useCanPlaySyntaxRush()

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Button
        variant="secondary"
        aria-disabled={!canPlay}
        aria-describedby="syntax-rush-note"
        className={canPlay ? '' : 'cursor-not-allowed opacity-50'}
        onClick={() => canPlay && startSyntaxGame()}
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
        {canPlay ? 'Type the letter, symbol or word on each bug. Esc pauses.' : SYNTAX_GATE_NOTE}
      </p>
    </div>
  )
}

export function MainMenu() {
  const bestScore = useGameStore((state) => state.bestScore)
  const startGame = useGameStore((state) => state.startGame)

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
        <img src={startMascot} alt="" className='h-auto max-h-[25dvh] w-auto'/>
      </div>

      <div className="flex w-full flex-col gap-5">
        <Button autoFocus onClick={startGame}>
          <PlayIcon className="size-6" />
          Play
        </Button>
        <ScoreBadge label="High Score" value={bestScore} />
        <p className="text-sm text-muted">Space, ↑ or tap to jump</p>
        <SyntaxRushOption />
      </div>
    </ScreenFrame>
  )
}
