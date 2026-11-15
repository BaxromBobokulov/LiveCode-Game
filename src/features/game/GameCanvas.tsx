import { useEffect, useRef } from 'react'

const PLACEHOLDER_SIZE = 48
const GROUND_OFFSET = 64

/**
 * Owns the <canvas> element and the requestAnimationFrame loop.
 * For now it only clears the canvas and draws a static placeholder each frame,
 * to prove the render loop works — real gameplay comes in later phases.
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

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

    let frameId = 0
    const frame = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const groundY = height - GROUND_OFFSET

      ctx.clearRect(0, 0, width, height)

      // Ground line
      ctx.fillStyle = '#334155'
      ctx.fillRect(0, groundY, width, 2)

      // Placeholder "mascot"
      ctx.fillStyle = '#34d399'
      ctx.fillRect(80, groundY - PLACEHOLDER_SIZE, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE)

      frameId = requestAnimationFrame(frame)
    }
    frameId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="block h-full w-full" />
}
