import { Button } from '../../components/Button'
import { PlayIcon } from '../../components/icons'
import { ScoreBadge } from '../../components/ScoreBadge'
import { useGameStore } from '../../store/gameStore'
import { MascotPlaceholder } from './MascotPlaceholder'
import { ScreenFrame } from './ScreenFrame'

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

      <div className="flex flex-1 items-center justify-center py-10">
        <MascotPlaceholder mood="happy" />
      </div>

      <div className="flex w-full flex-col gap-5">
        <Button autoFocus onClick={startGame}>
          <PlayIcon className="size-6" />
          Play
        </Button>
        <ScoreBadge label="High Score" value={bestScore} />
        <p className="text-sm text-muted">Space, ↑ or tap to jump</p>
      </div>
    </ScreenFrame>
  )
}
