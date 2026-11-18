import { useSyncExternalStore } from 'react'
import { meetsSyntaxGate } from '../../engine/syntaxRush'

/** A device with a real keyboard almost always has a fine pointer that can hover (mouse or trackpad). */
const FINE_HOVER_QUERY = '(hover: hover) and (pointer: fine)'

/** The media query, or null where matchMedia does not exist (old browsers, tests). */
const fineHoverQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(FINE_HOVER_QUERY) : null

function subscribe(onChange: () => void) {
  const query = fineHoverQuery()
  window.addEventListener('resize', onChange)
  query?.addEventListener('change', onChange)
  return () => {
    window.removeEventListener('resize', onChange)
    query?.removeEventListener('change', onChange)
  }
}

/** innerWidth is in CSS px, so browser zoom shrinks it; that is intended (bigger zoom, bigger tiles). */
const getSnapshot = () => meetsSyntaxGate(fineHoverQuery()?.matches ?? false, window.innerWidth)

/**
 * True when this device may start Syntax Rush (spec 0002, AC-2): a fine
 * pointer with hover and a window at least SYNTAX_MIN_WIDTH wide.
 * Updates live when the window resizes or the pointer setup changes.
 */
export function useCanPlaySyntaxRush(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/** The note shown next to a Syntax Rush button the gate has disabled. */
export const SYNTAX_GATE_NOTE = 'Syntax Rush needs a keyboard. Try it on a computer.'
