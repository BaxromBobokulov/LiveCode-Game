import { useEffect, useRef } from 'react'
import { checkAnyCollision } from '../../engine/collision'
import { applyGravity, applyVelocity, jump } from '../../engine/physics'
import { calculateScore, currentSpeed } from '../../engine/score'
import { advanceObstacles, pickSpawnInterval, spawnObstacle } from '../../engine/spawner'
import type { Entity, Obstacle } from '../../engine/types'
import { useGameStore } from '../../store/gameStore'

const MASCOT_SIZE = 48
const MASCOT_X = 80
const GROUND_OFFSET = 64
const TICK_SPACING = 40
const TICK_LENGTH = 8
/** Longest step we simulate in one frame, so a stalled tab doesn't cause a huge jump. */
const MAX_DT = 0.05

// --- Scene styling (drawing only; nothing here affects gameplay) ---

/** Background shapes move at this fraction of the ground speed, so they feel far away. */
const PARALLAX_RATIO = 0.2
/** Height of the bright strip along the top of the ground platform, in px. */
const GROUND_EDGE_HEIGHT = 6
/** Extra room past the right edge, so a shape fully leaves the screen before it wraps around. */
const DECOR_MARGIN = 40

type DecorKind = 'dot' | 'dash' | 'square' | 'chevron'
/**
 * A fixed pool of faint background shapes. Positions are fractions of the sky
 * area (x of the width, y of the space above the ground), so they fit any
 * screen size. Created once; drawing never allocates new ones.
 */
const DECOR: readonly { kind: DecorKind; x: number; y: number; size: number; alpha: number }[] = [
  { kind: 'dot', x: 0.06, y: 0.22, size: 3, alpha: 0.5 },
  { kind: 'square', x: 0.18, y: 0.55, size: 10, alpha: 0.35 },
  { kind: 'dash', x: 0.31, y: 0.12, size: 18, alpha: 0.35 },
  { kind: 'chevron', x: 0.44, y: 0.4, size: 9, alpha: 0.3 },
  { kind: 'dot', x: 0.55, y: 0.7, size: 2, alpha: 0.45 },
  { kind: 'square', x: 0.67, y: 0.18, size: 7, alpha: 0.3 },
  { kind: 'dash', x: 0.78, y: 0.6, size: 12, alpha: 0.3 },
  { kind: 'dot', x: 0.9, y: 0.33, size: 3, alpha: 0.4 },
]

/** Reads a color token from the @theme block in index.css, with a fallback. */
const readToken = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

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

    // Scene colors, read once from the design tokens.
    const colors = {
      skyTop: '#050a1c', // a touch darker than the canvas token, for depth
      skyBottom: readToken('--color-surface', '#101a3d'),
      groundFill: readToken('--color-canvas', '#0a1128'),
      groundTexture: readToken('--color-line', '#24346b'),
      accent: readToken('--color-accent', '#3b82f6'),
      decor: readToken('--color-muted', '#a5b4d4'),
    }
    /** The sky gradient depends on the canvas height, so it is rebuilt only on resize. */
    let skyGradient: CanvasGradient | null = null

    // Keep the drawing buffer matched to the element's CSS size (and the
    // device pixel ratio) so shapes stay sharp when the container resizes.
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      skyGradient = ctx.createLinearGradient(0, 0, 0, getGroundY())
      skyGradient.addColorStop(0, colors.skyTop)
      skyGradient.addColorStop(1, colors.skyBottom)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    // --- Game state ---
    const createMascot = (): Entity => ({
      x: MASCOT_X,
      y: getGroundY() - MASCOT_SIZE,
      vy: 0,
      width: MASCOT_SIZE,
      height: MASCOT_SIZE,
      onGround: true,
    })
    let mascot = createMascot()
    /** How far the ground pattern has scrolled, wrapped to one tick spacing. */
    let groundScroll = 0
    /** How far the background shapes have scrolled. Drawing only, never read by game logic. */
    let backgroundScroll = 0
    let obstacles: Obstacle[] = []
    let timeSinceLastSpawn = 0
    let spawnInterval = pickSpawnInterval()
    /** Seconds survived in the current run. Drives both the speed and the score. */
    let elapsedTime = 0
    /** Timestamp of the previous frame in ms, or null when the next frame should not advance time. */
    let lastTime: number | null = null
    /** The score we last sent to the store, so we only send it when it changes. */
    let publishedScore = 0
    /** True only while the store says 'playing'. Paused, hit, or on the menu: nothing moves. */
    let running = false

    /** Puts everything back to the start of a run. */
    const resetRun = () => {
      mascot = createMascot()
      groundScroll = 0
      backgroundScroll = 0
      obstacles = []
      timeSinceLastSpawn = 0
      spawnInterval = pickSpawnInterval()
      elapsedTime = 0
      publishedScore = 0
    }

    // The store's status drives the canvas. startGame() begins a fresh run,
    // resetToMenu() clears the scene, and pauseGame() / resumeGame() freeze and
    // continue the current run without touching its state.
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.status === previous.status) return
      const isResume = state.status === 'playing' && previous.status === 'paused'
      if ((state.status === 'playing' && !isResume) || state.status === 'menu') resetRun()
      running = state.status === 'playing'
      // Forget the last frame's timestamp, so the first frame after a pause
      // (or a new start) advances the game by zero time instead of by the gap.
      lastTime = null
    })
    // App only shows the canvas once a run has started, so pick up the
    // status that is already there.
    running = useGameStore.getState().status === 'playing'

    // Pause automatically when the player looks away (other tab, other window,
    // phone screen off). pauseGame() does nothing unless a run is playing.
    const pauseGame = () => useGameStore.getState().pauseGame()
    const handleVisibilityChange = () => {
      if (document.hidden) pauseGame()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', pauseGame)

    // --- Input ---
    const handleJump = () => {
      if (running) mascot = jump(mascot)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.code === 'Escape' || event.code === 'KeyP') {
        const { status, pauseGame, resumeGame } = useGameStore.getState()
        if (status === 'paused') resumeGame()
        else pauseGame()
        return
      }
      // Only while running: when paused, Space must still be able to press the
      // focused Resume button.
      if (running && (event.code === 'Space' || event.code === 'ArrowUp')) {
        event.preventDefault() // stop the page from scrolling
        handleJump()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    // pointerdown covers mouse click, touch tap and pen in one event.
    canvas.addEventListener('pointerdown', handleJump)

    const update = (dt: number) => {
      const groundY = getGroundY()
      elapsedTime += dt
      // The ground and the obstacles share one speed, which grows with time.
      const distance = currentSpeed(elapsedTime) * dt

      mascot = applyVelocity(applyGravity(mascot, dt), dt, groundY)
      groundScroll = (groundScroll + distance) % TICK_SPACING
      // Not wrapped here: the draw step wraps it to the screen width, which can change on resize.
      backgroundScroll += distance * PARALLAX_RATIO

      // Move existing obstacles, then maybe add a new one at the right edge.
      obstacles = advanceObstacles(obstacles, distance, groundY)
      timeSinceLastSpawn += dt
      const spawned = spawnObstacle(timeSinceLastSpawn, spawnInterval, canvas.clientWidth, groundY)
      if (spawned) {
        obstacles.push(spawned)
        timeSinceLastSpawn = 0
        spawnInterval = pickSpawnInterval()
      }

      // Checked in the same frame the obstacles moved, so a hit stops the game
      // before another frame of movement can happen.
      const score = calculateScore(elapsedTime)
      if (checkAnyCollision(mascot, obstacles)) {
        running = false
        useGameStore.getState().endGame(score)
        return
      }

      // The score is worked out every frame, but the store only hears about it
      // when the whole number changes. That is SCORE_RATE updates per second at
      // most, instead of one per frame, so the UI does not re-render needlessly.
      if (score !== publishedScore) {
        publishedScore = score
        useGameStore.getState().setScore(score)
      }
    }

    /**
     * Faint shapes drifting left behind the action. Each one wraps around a
     * loop slightly wider than the screen, so it reappears on the right
     * after leaving on the left.
     */
    const drawDecor = (width: number, groundY: number) => {
      const loop = width + DECOR_MARGIN * 2
      ctx.strokeStyle = colors.decor
      ctx.fillStyle = colors.decor
      ctx.lineWidth = 1.5
      for (const item of DECOR) {
        const offset = (item.x * loop - backgroundScroll) % loop
        const x = (offset < 0 ? offset + loop : offset) - DECOR_MARGIN
        const y = item.y * groundY
        const s = item.size
        ctx.globalAlpha = item.alpha
        if (item.kind === 'dot') {
          ctx.beginPath()
          ctx.arc(x, y, s, 0, Math.PI * 2)
          ctx.fill()
        } else if (item.kind === 'dash') {
          ctx.fillRect(x, y, s, 2)
        } else if (item.kind === 'square') {
          ctx.strokeRect(x, y, s, s)
        } else {
          // A small "<" angle bracket.
          ctx.beginPath()
          ctx.moveTo(x + s * 0.6, y - s / 2)
          ctx.lineTo(x, y)
          ctx.lineTo(x + s * 0.6, y + s / 2)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const groundY = getGroundY()

      // Sky: dark navy gradient, a little lighter toward the ground.
      ctx.fillStyle = skyGradient ?? colors.skyBottom
      ctx.fillRect(0, 0, width, groundY)

      drawDecor(width, groundY)

      // Ground platform: a solid band from the ground line to the bottom.
      ctx.fillStyle = colors.groundFill
      ctx.fillRect(0, groundY, width, height - groundY)
      // Tick marks scrolling left inside the band. Because groundScroll wraps
      // at exactly one spacing, the pattern repeats seamlessly.
      ctx.fillStyle = colors.groundTexture
      for (let x = -groundScroll; x < width; x += TICK_SPACING) {
        ctx.fillRect(x, groundY + GROUND_EDGE_HEIGHT + 8, 2, TICK_LENGTH)
      }
      // Bright accent strip along the top edge, with a thin lighter line on top.
      ctx.fillStyle = colors.accent
      ctx.fillRect(0, groundY, width, GROUND_EDGE_HEIGHT)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.fillRect(0, groundY, width, 1)

      // Placeholder obstacles
      ctx.fillStyle = '#f87171'
      for (const obstacle of obstacles) {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
      }

      // Placeholder mascot
      ctx.fillStyle = '#34d399'
      ctx.fillRect(mascot.x, mascot.y, mascot.width, mascot.height)
    }

    // --- Loop ---
    let frameId = 0
    const frame = (time: number) => {
      // rAF timestamps are in ms; the engine works in seconds.
      const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT)
      lastTime = time

      // While paused we keep drawing the frozen scene (so a resize still
      // repaints it), but stop updating it. elapsedTime only ever grows inside
      // update(), so time spent paused is never counted.
      if (running) update(dt)
      draw()

      frameId = requestAnimationFrame(frame)
    }
    frameId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(frameId)
      unsubscribe()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', pauseGame)
      window.removeEventListener('keydown', handleKeyDown)
      canvas.removeEventListener('pointerdown', handleJump)
    }
  }, [])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
