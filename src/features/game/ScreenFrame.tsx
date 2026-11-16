import type { ReactNode } from 'react'

/**
 * The shared frame for the full screen pages (Main Menu and Game Over):
 * a centered, phone shaped card on wider screens, and the whole viewport on a phone.
 */
export function ScreenFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center sm:p-6">
      <section className="relative flex min-h-dvh w-full flex-col items-center overflow-hidden bg-linear-to-b from-surface to-canvas px-6 py-10 text-center sm:min-h-[min(40rem,100dvh-3rem)] sm:max-w-sm sm:rounded-3xl sm:border sm:border-line">
        {/* Faint code symbols in the background, purely decorative. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 font-mono font-bold text-line select-none">
          <span className="absolute top-[38%] left-5 text-3xl">{'{}'}</span>
          <span className="absolute top-[58%] right-5 text-2xl">{'</>'}</span>
          <span className="absolute top-[24%] right-8 text-xl">;</span>
        </div>
        {/* Soft blue hill at the bottom, like the mockup. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/2 h-32 w-[140%] -translate-x-1/2 rounded-[100%] bg-accent-strong/20"
        />
        <div className="relative flex w-full flex-1 flex-col items-center">{children}</div>
      </section>
    </div>
  )
}
