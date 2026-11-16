type MascotPlaceholderProps = {
  /** happy = menu pose, hit = game over pose. */
  mood: 'happy' | 'hit'
}

/**
 * Stand-in for the mascot until real sprites exist: a simple terminal window
 * box drawn with CSS. Decorative only.
 */
export function MascotPlaceholder({ mood }: MascotPlaceholderProps) {
  const isHit = mood === 'hit'
  return (
    <div aria-hidden className="relative select-none">
      {/* glow behind the mascot */}
      <div className="absolute inset-0 scale-125 rounded-full bg-accent/25 blur-2xl" />
      <div
        className={`relative flex h-28 w-36 flex-col rounded-2xl border-4 border-ink bg-canvas shadow-[6px_6px_0_0_var(--color-accent-strong)] ${isHit ? 'rotate-12' : '-rotate-6'}`}
      >
        <div className="flex gap-1.5 px-3 pt-2.5">
          <span className="size-2 rounded-full bg-red-400" />
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="size-2 rounded-full bg-emerald-400" />
        </div>
        <div className="flex flex-1 items-center justify-center pb-2 font-mono text-4xl font-bold text-ink">
          {isHit ? 'x_x' : '>_<'}
        </div>
      </div>
    </div>
  )
}
