import { TrophyIcon } from './icons'

type ScoreBadgeProps = {
  label: string
  value: number
}

/** A trophy, a label and a gold number on one line, for example "High Score: 128". */
export function ScoreBadge({ label, value }: ScoreBadgeProps) {
  return (
    <p className="flex items-center justify-center gap-2 text-lg font-medium text-muted">
      <TrophyIcon className="size-5 text-gold" />
      <span>
        {label}: <span className="font-bold text-gold tabular-nums">{value}</span>
      </span>
    </p>
  )
}
