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
