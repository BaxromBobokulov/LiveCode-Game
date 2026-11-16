import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary = filled blue (the main action). secondary = outlined. */
  variant?: 'primary' | 'secondary'
}

const BASE =
  'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-6 font-bold transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

const VARIANTS = {
  primary: 'bg-accent-strong py-3.5 text-xl text-white hover:bg-accent',
  secondary:
    'border-2 border-line py-2.5 text-base text-ink hover:border-accent hover:bg-surface',
}

/** The one button style shared by the menu, the pause overlay and the game over screen. */
export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button type="button" className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />
}
