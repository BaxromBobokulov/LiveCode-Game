import { describe, expect, it } from 'vitest'
import { BLIP_BASE_HZ, BLIP_MAX_SEMITONES, blipFrequency, playBlip } from './sound'

describe('blipFrequency', () => {
  it('starts a streak at the base pitch', () => {
    expect(blipFrequency(1)).toBe(BLIP_BASE_HZ)
  })

  it('treats a zero or negative combo as the base pitch', () => {
    expect(blipFrequency(0)).toBe(BLIP_BASE_HZ)
    expect(blipFrequency(-3)).toBe(BLIP_BASE_HZ)
  })

  it('rises one semitone per combo step', () => {
    expect(blipFrequency(2)).toBeCloseTo(BLIP_BASE_HZ * 2 ** (1 / 12))
    expect(blipFrequency(2)).toBeGreaterThan(blipFrequency(1))
  })

  it('stops rising after one octave', () => {
    const cap = BLIP_BASE_HZ * 2 ** (BLIP_MAX_SEMITONES / 12)
    expect(blipFrequency(BLIP_MAX_SEMITONES + 1)).toBeCloseTo(cap)
    expect(blipFrequency(100)).toBeCloseTo(cap)
  })
})

describe('playBlip', () => {
  it('never throws when Web Audio is missing', () => {
    expect(() => playBlip(1)).not.toThrow()
  })
})
