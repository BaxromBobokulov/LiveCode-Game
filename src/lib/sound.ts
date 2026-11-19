// Procedural sound effects with the Web Audio API: no audio files, no library.
// Like storage.ts, nothing here ever throws. If the browser has no Web Audio
// (or blocks it), every call is a silent no op.

/** The pitch of the first blip in a streak: E5, bright but not shrill. */
export const BLIP_BASE_HZ = 660
/** Each extra combo step raises the pitch by one semitone... */
export const BLIP_SEMITONES_PER_COMBO = 1
/** ...up to one octave, so a long streak never turns piercing. */
export const BLIP_MAX_SEMITONES = 12
/** The quick upward chirp at the start of each blip (a perfect fifth). */
const BLIP_CHIRP_RATIO = 1.5
const BLIP_CHIRP_TIME = 0.03
const BLIP_ATTACK = 0.005
const BLIP_DURATION = 0.09
/** Peak volume. Square waves are loud for their gain, so this stays low. */
const BLIP_VOLUME = 0.05
/** Exponential ramps can't reach 0, so the tail fades to this instead. */
const SILENT = 0.0001

/**
 * The starting pitch of a blip for the current combo (1 = the first hit of a
 * streak). Rises a semitone per step and stops rising after one octave.
 */
export function blipFrequency(combo: number): number {
  const steps = Math.min(Math.max(combo - 1, 0) * BLIP_SEMITONES_PER_COMBO, BLIP_MAX_SEMITONES)
  return BLIP_BASE_HZ * 2 ** (steps / 12)
}

let audioContext: AudioContext | null = null

/**
 * Created on the first blip, which always comes from a key press, so the
 * browser's autoplay rule (audio needs a user gesture) is satisfied.
 */
const getContext = (): AudioContext | null => {
  if (audioContext) return audioContext
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    audioContext = Context ? new Context() : null
  } catch {
    audioContext = null
  }
  return audioContext
}

/** A short square wave "blip" for a destroyed bug or word. Higher with the combo. */
export function playBlip(combo: number): void {
  const context = getContext()
  if (!context) return
  try {
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime
    const frequency = blipFrequency(combo)

    const oscillator = context.createOscillator()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * BLIP_CHIRP_RATIO, now + BLIP_CHIRP_TIME)

    const gain = context.createGain()
    gain.gain.setValueAtTime(SILENT, now)
    gain.gain.exponentialRampToValueAtTime(BLIP_VOLUME, now + BLIP_ATTACK)
    gain.gain.exponentialRampToValueAtTime(SILENT, now + BLIP_DURATION)

    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + BLIP_DURATION + 0.01)
  } catch {
    // A failed sound never breaks the game.
  }
}
