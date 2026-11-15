import { useEffect, useRef } from 'react'
import { BASE_SPEED } from '../../constants/game'
import { applyGravity, applyVelocity, jump } from '../../engine/physics'
import type { Entity } from '../../engine/types'

const MASCOT_SIZE = 48
const MASCOT_X = 80
const GROUND_OFFSET = 64
const TICK_SPACING = 40
const TICK_LENGTH = 8
/** Longest step we simulate in one frame, so a stalled tab doesn't cause a huge jump. */
const MAX_DT = 0.05

/**
 * Owns the <canvas> element and the requestAnimationFrame loop.
 * Game state lives in local variables inside the effect (not React state),
 * so per-frame updates never trigger a re-render.
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const getGroundY = () => canvas.clientHeight - GROUND_OFFSET

    // Keep the drawing buffer matched to the element's CSS size (and the
    // device pixel ratio) so shapes stay sharp when the container resizes.
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    // --- Game state ---
    let mascot: Entity = {
      x: MASCOT_X,
      y: getGroundY() - MASCOT_SIZE,
      vy: 0,
      width: MASCOT_SIZE,
      height: MASCOT_SIZE,
      onGround: true,
    }
    /** How far the ground pattern has scrolled, wrapped to one tick spacing. */
    let groundScroll = 0

    // --- Input ---
    const handleJump = () => {
      mascot = jump(mascot)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault() // stop the page from scrolling
        handleJump()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    // pointerdown covers mouse click, touch tap and pen in one event.
    canvas.addEventListener('pointerdown', handleJump)

    const update = (dt: number) => {
      mascot = applyVelocity(applyGravity(mascot, dt), dt, getGroundY())
      groundScroll = (groundScroll + BASE_SPEED * dt) % TICK_SPACING
    }

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const groundY = getGroundY()

      ctx.clearRect(0, 0, width, height)

      // Ground line + tick marks scrolling left. Because groundScroll wraps at
      // exactly one spacing, the pattern repeats seamlessly.
      ctx.fillStyle = '#334155'
      ctx.fillRect(0, groundY, width, 2)
      for (let x = -groundScroll; x < width; x += TICK_SPACING) {
        ctx.fillRect(x, groundY + 8, 2, TICK_LENGTH)
      }

      // Placeholder mascot
      ctx.fillStyle = '#34d399'
      ctx.fillRect(mascot.x, mascot.y, mascot.width, mascot.height)
    }

    // --- Loop ---
    let frameId = 0
    let lastTime: number | null = null
    const frame = (time: number) => {
      // rAF timestamps are in ms; the engine works in seconds.
      const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT)
      lastTime = time

      update(dt)
      draw()

      frameId = requestAnimationFrame(frame)
    }
    frameId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      window.removeEventListener('keydown', handleKeyDown)
      canvas.removeEventListener('pointerdown', handleJump)
    }
  }, [])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
