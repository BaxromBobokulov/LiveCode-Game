import { useEffect, useRef } from 'react'
import { checkAnyCollision } from '../../engine/collision'
import { applyGravity, applyVelocity, jump } from '../../engine/physics'
import { calculateScore, currentSpeed } from '../../engine/score'
import {
  advanceObstacles,
  advancePlatforms,
  intervalAfterPlatform,
  pickSpawnInterval,
  pickSpawnKind,
  spawnObstacle,
  spawnPlatform,
} from '../../engine/spawner'
import { floorY, platformTop, platformWalls } from '../../engine/terrain'
import type { Entity, Obstacle, Platform } from '../../engine/types'
import { useGameStore } from '../../store/gameStore'
import { JUMP_FORCE } from '../../constants/game'
import mascotSrc from '../../assets/start-mascot.webp'

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

// --- Mascot sprite (drawing only; the hitbox is still the MASCOT_SIZE square) ---

/**
 * Loaded once per page, not per run or per frame. The Main Menu shows the same
 * file, so it is usually already in the browser cache by the time a run starts.
 */
const mascotImage = new Image()
mascotImage.src = mascotSrc

/** Drawn height of the whole image, in px. A bit taller than the hitbox, since the image has empty space around the body. */
const SPRITE_HEIGHT = 62
/**
 * Where the body's middle sits across the image, as a fraction of its width.
 * The speed lines on the left make the image wider than the body, so the
 * body is centered over the hitbox instead of the whole image.
 */
const SPRITE_BODY_CENTER_X = 0.54
/** How high the running bob lifts the mascot, in px. It only goes up, so the feet never sink into the ground. */
const BOB_HEIGHT = 3
/** Running bobs per second. */
const BOB_RATE = 5
/** Largest tilt during a jump, in radians (about 12 degrees). */
const MAX_TILT = 0.2
/** How fast the shown tilt catches up with the target tilt, per second. Higher is snappier. */
const TILT_EASE = 14

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
      // Resizing the buffer resets the context, so set this again. The sprite
      // is shrunk a lot (768px wide down to about 70), which looks rough without it.
      ctx.imageSmoothingQuality = 'high'
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
    /** Raised sections of ground scrolling past (spec 0001). */
    let platforms: Platform[] = []
    /** True when the last spawn was a platform, so the next one is always an obstacle. */
    let lastSpawnWasPlatform = false
    /** The mascot's bottom edge on the previous frame. floorY needs it to tell landing from running into a side. */
    let prevBottom = mascot.y + mascot.height
    /** The ground line on the previous frame, to notice a resize. */
    let prevGroundY = getGroundY()
    let timeSinceLastSpawn = 0
    let spawnInterval = pickSpawnInterval()
    /** Seconds survived in the current run. Drives both the speed and the score. */
    let elapsedTime = 0
    /** Timestamp of the previous frame in ms, or null when the next frame should not advance time. */
    let lastTime: number | null = null
    /** The mascot's tilt as drawn, in radians. Eases toward the target so landing doesn't snap. Drawing only. */
    let mascotTilt = 0
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
      platforms = []
      lastSpawnWasPlatform = false
      prevBottom = mascot.y + mascot.height
      prevGroundY = getGroundY()
      timeSinceLastSpawn = 0
      spawnInterval = pickSpawnInterval()
      elapsedTime = 0
      mascotTilt = 0
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
      // The window was resized: the ground line moved, so move the mascot with
      // it. It keeps its height above whatever it stands on, and a platform top
      // can never jump above its feet.
      if (groundY !== prevGroundY) {
        mascot = { ...mascot, y: mascot.y + groundY - prevGroundY }
        prevBottom += groundY - prevGroundY
      }
      elapsedTime += dt
      const speed = currentSpeed(elapsedTime)
      // The ground, obstacles and platforms share one speed, which grows with time.
      const distance = speed * dt
      const score = calculateScore(elapsedTime)

      // Move the scenery first, so the floor lookup sees where platforms are now.
      platforms = advancePlatforms(platforms, distance)
      obstacles = advanceObstacles(obstacles, distance, groundY)
      groundScroll = (groundScroll + distance) % TICK_SPACING
      // Not wrapped here: the draw step wraps it to the screen width, which can change on resize.
      backgroundScroll += distance * PARALLAX_RATIO

      const floor = floorY(mascot, prevBottom, platforms, groundY)
      mascot = applyVelocity(applyGravity(mascot, dt), dt, floor)

      // Maybe add a platform or an obstacle at the right edge.
      timeSinceLastSpawn += dt
      if (timeSinceLastSpawn >= spawnInterval) {
        const spawnX = canvas.clientWidth
        if (pickSpawnKind(score, lastSpawnWasPlatform) === 'platform') {
          const platform = spawnPlatform(spawnX)
          platforms.push(platform)
          lastSpawnWasPlatform = true
          // Wait for the whole platform to come in before the next spawn.
          spawnInterval = intervalAfterPlatform(platform, speed)
        } else {
          const spawned = spawnObstacle(timeSinceLastSpawn, spawnInterval, spawnX, groundY)
          if (spawned) obstacles.push(spawned)
          lastSpawnWasPlatform = false
          spawnInterval = pickSpawnInterval()
        }
        timeSinceLastSpawn = 0
      }

      prevBottom = mascot.y + mascot.height
      prevGroundY = groundY

      // Visual tilt: lean forward while rising (vy < 0), back while falling,
      // flat on the ground. Eased so the lean doesn't snap to flat on landing.
      const targetTilt = mascot.onGround
        ? 0
        : Math.max(-1, Math.min(1, -mascot.vy / JUMP_FORCE)) * MAX_TILT
      mascotTilt += (targetTilt - mascotTilt) * Math.min(1, dt * TILT_EASE)

      // Checked in the same frame everything moved, so a hit stops the game
      // before another frame of movement can happen. A platform's side counts
      // the same as an obstacle.
      if (checkAnyCollision(mascot, [...obstacles, ...platformWalls(platforms, groundY)])) {
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

      // Raised platforms: the ground slab drawn higher, with the same fill and
      // edge strip, so they read as ground and not as an obstacle.
      for (const platform of platforms) {
        const top = platformTop(platform, groundY)
        ctx.fillStyle = colors.groundFill
        ctx.fillRect(platform.x, top, platform.width, platform.rise)
        // Thin outline on the sides, so the step stands out against the sky.
        ctx.fillStyle = colors.groundTexture
        ctx.fillRect(platform.x, top, 2, platform.rise)
        ctx.fillRect(platform.x + platform.width - 2, top, 2, platform.rise)
        ctx.fillStyle = colors.accent
        ctx.fillRect(platform.x, top, platform.width, GROUND_EDGE_HEIGHT)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
        ctx.fillRect(platform.x, top, platform.width, 1)
      }

      // Placeholder obstacles
      ctx.fillStyle = '#f87171'
      for (const obstacle of obstacles) {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
      }

      drawMascot()
    }

    /**
     * Draws the mascot sprite over its hitbox. The feet line up with the
     * hitbox bottom and the body is centered across it. Only the picture moves
     * (bob and tilt); mascot.x / y / width / height are never touched here.
     */
    const drawMascot = () => {
      if (!mascotImage.complete || mascotImage.naturalWidth === 0) return // still loading
      const height = SPRITE_HEIGHT
      const width = height * (mascotImage.naturalWidth / mascotImage.naturalHeight)
      // Bob only while running on the ground. It follows elapsedTime, so it
      // freezes while paused along with everything else.
      const bob = mascot.onGround ? Math.abs(Math.sin(elapsedTime * BOB_RATE * Math.PI)) * BOB_HEIGHT : 0
      const centerX = mascot.x + mascot.width / 2
      const bottom = mascot.y + mascot.height - bob

      // Rotate around the middle of the sprite, so the lean looks like a body
      // turning and not like a swing from the feet.
      ctx.save()
      ctx.translate(centerX, bottom - height / 2)
      ctx.rotate(mascotTilt)
      ctx.drawImage(mascotImage, -width * SPRITE_BODY_CENTER_X, -height / 2, width, height)
      ctx.restore()
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
