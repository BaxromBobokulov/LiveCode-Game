import { useEffect, useRef } from 'react'
import { checkCollision } from '../../engine/collision'
import {
  advanceSymbolObstacles,
  classifyKey,
  findTarget,
  graceSpeedFactor,
  pickSymbol,
  pickSyntaxSpawnInterval,
  resolveKey,
  spawnSymbolObstacle,
  syntaxScore,
  syntaxSpeed,
  syntaxViewScale,
  typingStats,
  visibleObstacles,
} from '../../engine/syntaxRush'
import type { Entity, SymbolObstacle } from '../../engine/types'
import { useGameStore } from '../../store/gameStore'
import {
  GRACE_DURATION,
  MASCOT_SIZE,
  MASCOT_X,
  SCALE,
  SYNTAX_LIVES,
  SYNTAX_VIEW_WIDTH,
  WRONG_FLASH_DURATION,
  WRONG_FLASH_MIN_GAP,
} from '../../constants/game'
import mascotSrc from '../../assets/start-mascot.webp'
import bugSrc from '../../assets/bug-obstacle.webp'
import cloudSrc from '../../assets/cloud.webp'

// Syntax Rush (spec 0002). Follows GameCanvas.tsx closely but imports nothing
// from it: Classic Runner must stay untouched, so the scene helpers below are
// copies (an accepted duplication, see the spec's follow up list).
//
// The play area is always SYNTAX_VIEW_WIDTH world px wide on every screen, so
// reaction time does not depend on the window. All px values are world px.

// --- Scene layout (copied from GameCanvas.tsx) ---
const GROUND_SHARE = 0.25
const GROUND_MIN_HEIGHT = 64 * SCALE
const SKY_MIN_HEIGHT = 300 * SCALE
const TICK_SPACING = 40 * SCALE
const TICK_LENGTH = 8 * SCALE
const MAX_DT = 0.05
const PARALLAX_RATIO = 0.2
const GROUND_EDGE_HEIGHT = 6 * SCALE
const SCALLOP_WIDTH = 20 * SCALE
const SCALLOP_DEPTH = 5 * SCALE

// --- Mascot sprite (copied; the mascot only runs in place here) ---
const SPRITE_HEIGHT = 62 * SCALE
const SPRITE_BODY_CENTER_X = 0.54
const BOB_HEIGHT = 3 * SCALE
const BOB_RATE = 5
/** During grace the mascot switches between these two opacities every BLINK_STEP seconds. */
const BLINK_DIM = 0.35
const BLINK_STEP = 0.1

// --- Character tiles above the bugs ---
const SYMBOL_TILE_SIZE = 22 * SCALE
const SYMBOL_TILE_RADIUS = 5 * SCALE
const SYMBOL_TILE_GAP = 6 * SCALE
/** At the narrowest allowed window (view scale 0.8) this is about 22 CSS px, still easy to read. */
const SYMBOL_FONT_SIZE = 14 * SCALE
const SYMBOL_FONT = `bold ${SYMBOL_FONT_SIZE}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
const TARGET_TILE_SCALE = 1.2
const TARGET_OUTLINE_WIDTH = 1.5 * SCALE

// --- Particle bursts (same fixed pool pattern as Classic's landing dust) ---
/** How many bursts can play at once; a new one reuses the oldest. */
const BURST_POOL = 4
/** Particles per burst, flying out on evenly spaced directions. */
const BURST_PARTICLES = 6
const BURST_SPEED = 160 * SCALE
const BURST_DRAG = 6
const BURST_LIFE = 0.35
const BURST_RADIUS = 3 * SCALE

// --- Wrong key flash and layout hint ---
/** Width of the red band along each screen edge. */
const FLASH_EDGE = 8 * SCALE
const FLASH_ALPHA = 0.5
const FLASH_ALPHA_REDUCED = 0.25
const LAYOUT_HINT_DURATION = 3
const LAYOUT_HINT = 'Switch to an English keyboard layout for code symbols'

// Loaded once per page, like in GameCanvas.tsx.
const mascotImage = new Image()
mascotImage.src = mascotSrc
const bugImage = new Image()
bugImage.src = bugSrc
const cloudImage = new Image()
cloudImage.src = cloudSrc

const CLOUD_MARGIN = 130 * SCALE
const CLOUDS: readonly { x: number; y: number; width: number; alpha: number }[] = [
  { x: 0.1, y: 0.08, width: 110 * SCALE, alpha: 0.22 },
  { x: 0.36, y: 0.3, width: 84 * SCALE, alpha: 0.16 },
  { x: 0.6, y: 0.05, width: 96 * SCALE, alpha: 0.2 },
  { x: 0.84, y: 0.24, width: 120 * SCALE, alpha: 0.18 },
]

/** Reads a color token from the @theme block in index.css, with a fallback. */
const readToken = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

/** True when the player asked the system for less motion. Never throws. */
const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

type Particle = { x: number; y: number; vx: number; vy: number; age: number; color: string }

/**
 * Owns the Syntax Rush <canvas> and its requestAnimationFrame loop. Like
 * GameCanvas, all game state lives in local variables inside the effect, so
 * per frame updates never re-render React. The store only hears about the
 * score, lives and combo when they change, and about the end of the run.
 */
export function SyntaxRushCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // How big a world px is on screen, from the width only. Guarded so a
    // zero size canvas (mid layout) never divides by zero.
    const viewScale = () => Math.max(syntaxViewScale(canvas.clientWidth), 0.01)
    const worldHeight = () => canvas.clientHeight / viewScale()
    const getGroundY = () => {
      const height = worldHeight()
      const band = Math.max(GROUND_MIN_HEIGHT, Math.min(height * GROUND_SHARE, height - SKY_MIN_HEIGHT))
      return height - band
    }

    const colors = {
      skyTop: '#050a1c',
      skyBottom: readToken('--color-surface', '#101a3d'),
      surface: readToken('--color-surface', '#101a3d'),
      groundFill: readToken('--color-canvas', '#0a1128'),
      groundTexture: readToken('--color-line', '#24346b'),
      accent: readToken('--color-accent', '#3b82f6'),
      gold: readToken('--color-gold', '#fbbf24'),
      muted: readToken('--color-muted', '#a5b4d4'),
      danger: readToken('--color-danger', '#ef4444'),
    }
    const flashAlpha = prefersReducedMotion() ? FLASH_ALPHA_REDUCED : FLASH_ALPHA
    let skyGradient: CanvasGradient | null = null

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      ctx.imageSmoothingQuality = 'high'
      skyGradient = ctx.createLinearGradient(0, 0, 0, getGroundY())
      skyGradient.addColorStop(0, colors.skyTop)
      skyGradient.addColorStop(1, colors.skyBottom)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    // --- Game state ---
    /** The mascot never moves: it is rebuilt from the current ground line every frame. */
    const mascotBox = (groundY: number): Entity => ({
      x: MASCOT_X,
      y: groundY - MASCOT_SIZE,
      vy: 0,
      width: MASCOT_SIZE,
      height: MASCOT_SIZE,
      onGround: true,
    })
    let obstacles: SymbolObstacle[] = []
    let nextId = 0
    let lastSymbol: string | null = null
    /** World seconds: slows down during grace. Drives speed, distance score and the running bob. */
    let elapsedTime = 0
    /** Real seconds of play, pauses excluded. Drives WPM. */
    let activeTime = 0
    let timeSinceLastSpawn = 0
    let spawnInterval = pickSyntaxSpawnInterval()
    let lives = SYNTAX_LIVES
    let combo = 0
    let destroyed = 0
    let correctKeys = 0
    let wrongKeys = 0
    /** Real seconds of grace left after a lost life. */
    let graceLeft = 0
    let flashLeft = 0
    /** Starts at Infinity so the first wrong key of a run always flashes. */
    let sinceLastFlash = Infinity
    let layoutHintLeft = 0
    let layoutHintShown = false
    let groundScroll = 0
    let cloudScroll = 0
    const particles: Particle[] = Array.from({ length: BURST_POOL * BURST_PARTICLES }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: BURST_LIFE,
      color: colors.accent,
    }))
    let nextBurst = 0
    let publishedScore = 0
    let running = false
    let lastTime: number | null = null

    const resetRun = () => {
      obstacles = []
      nextId = 0
      lastSymbol = null
      elapsedTime = 0
      activeTime = 0
      timeSinceLastSpawn = 0
      spawnInterval = pickSyntaxSpawnInterval()
      lives = SYNTAX_LIVES
      combo = 0
      destroyed = 0
      correctKeys = 0
      wrongKeys = 0
      graceLeft = 0
      flashLeft = 0
      sinceLastFlash = Infinity
      layoutHintLeft = 0
      layoutHintShown = false
      groundScroll = 0
      cloudScroll = 0
      for (const particle of particles) particle.age = BURST_LIFE
      nextBurst = 0
      publishedScore = 0
    }

    /** Fires one burst (the oldest slot in the pool) from the middle of a bug. */
    const burstAt = (obstacle: SymbolObstacle, color: string) => {
      const start = nextBurst * BURST_PARTICLES
      nextBurst = (nextBurst + 1) % BURST_POOL
      for (let i = 0; i < BURST_PARTICLES; i++) {
        const angle = (i / BURST_PARTICLES) * Math.PI * 2 - Math.PI / 2
        const particle = particles[start + i]
        particle.x = obstacle.x + obstacle.width / 2
        particle.y = obstacle.y + obstacle.height / 2
        particle.vx = Math.cos(angle) * BURST_SPEED
        particle.vy = Math.sin(angle) * BURST_SPEED
        particle.age = 0
        particle.color = color
      }
    }

    const removeObstacle = (id: number, color: string) => {
      const obstacle = obstacles.find((o) => o.id === id)
      if (!obstacle) return
      burstAt(obstacle, color)
      obstacles = obstacles.filter((o) => o.id !== id)
    }

    // Same lifecycle as GameCanvas: the store's status drives the canvas.
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.status === previous.status) return
      const isResume = state.status === 'playing' && previous.status === 'paused'
      if ((state.status === 'playing' && !isResume) || state.status === 'menu') resetRun()
      running = state.status === 'playing'
      lastTime = null
    })
    running = useGameStore.getState().status === 'playing'

    const pauseGame = () => useGameStore.getState().pauseGame()
    const handleVisibilityChange = () => {
      if (document.hidden) pauseGame()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', pauseGame)

    // --- Input: the keyboard is the only control (spec 0002, AC-9 to AC-15) ---
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (event.repeat) return
        const { status, pauseGame, resumeGame } = useGameStore.getState()
        if (status === 'paused') resumeGame()
        else pauseGame()
        return
      }
      // Paused or over: leave every key alone, so Space and Enter still press buttons.
      if (!running) return

      const keyClass = classifyKey(event)
      if (keyClass.kind === 'ignore') return
      // Stop browser shortcuts (quick find on / and ', page scroll on Space).
      event.preventDefault()
      if (keyClass.kind === 'block') return

      if (keyClass.nonLatin && !layoutHintShown) {
        layoutHintShown = true
        layoutHintLeft = LAYOUT_HINT_DURATION
      }
      // Nothing to type yet: not a mistake, just ignored.
      if (visibleObstacles(obstacles).length === 0) return

      const id = resolveKey(keyClass.char, obstacles)
      const store = useGameStore.getState()
      if (id !== null) {
        removeObstacle(id, colors.accent)
        destroyed += 1
        correctKeys += 1
        combo += 1
        store.setCombo(combo)
      } else {
        wrongKeys += 1
        combo = 0
        store.setCombo(0)
        if (sinceLastFlash >= WRONG_FLASH_MIN_GAP) {
          flashLeft = WRONG_FLASH_DURATION
          sinceLastFlash = 0
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    const update = (dt: number) => {
      // 1. Time: the world slows during grace, the timers below run on real time.
      const worldDt = dt * graceSpeedFactor(graceLeft)
      graceLeft = Math.max(0, graceLeft - dt)
      flashLeft = Math.max(0, flashLeft - dt)
      sinceLastFlash += dt
      layoutHintLeft = Math.max(0, layoutHintLeft - dt)
      activeTime += dt
      elapsedTime += worldDt

      // 2. Move the world.
      const groundY = getGroundY()
      const mascot = mascotBox(groundY)
      const distance = syntaxSpeed(elapsedTime) * worldDt
      obstacles = advanceSymbolObstacles(obstacles, distance, groundY)
      groundScroll = (groundScroll + distance) % TICK_SPACING
      cloudScroll += distance * PARALLAX_RATIO
      const drag = Math.max(0, 1 - BURST_DRAG * worldDt)
      for (const particle of particles) {
        if (particle.age >= BURST_LIFE) continue
        particle.age += worldDt
        particle.vx *= drag
        particle.vy *= drag
        // Particles sit on the scrolling world, so they drift left with it.
        particle.x += particle.vx * worldDt - distance
        particle.y += particle.vy * worldDt
      }

      // 3. Spawn.
      const score = syntaxScore(elapsedTime, destroyed)
      timeSinceLastSpawn += worldDt
      if (timeSinceLastSpawn >= spawnInterval) {
        const symbol = pickSymbol(score, lastSymbol)
        obstacles.push(spawnSymbolObstacle(nextId++, groundY, symbol))
        lastSymbol = symbol
        spawnInterval = pickSyntaxSpawnInterval()
        timeSinceLastSpawn = 0
      }

      // 4. Hits. The first one outside grace costs a life and starts grace,
      // so any others in the same frame pop for free.
      for (const obstacle of obstacles.filter((o) => checkCollision(mascot, o))) {
        removeObstacle(obstacle.id, colors.danger)
        if (graceLeft > 0) continue
        lives -= 1
        combo = 0
        if (lives === 0) {
          running = false
          useGameStore.getState().endSyntaxGame(score, typingStats(correctKeys, wrongKeys, activeTime))
          return
        }
        const store = useGameStore.getState()
        store.setLives(lives)
        store.setCombo(0)
        graceLeft = GRACE_DURATION
      }

      // 5. The store only hears about the score when the whole number changes.
      if (score !== publishedScore) {
        publishedScore = score
        useGameStore.getState().setScore(score)
      }
    }

    // --- Drawing (copied scene, plus tiles, bursts, flash and hint) ---
    const drawClouds = (width: number, groundY: number) => {
      if (!cloudImage.complete || cloudImage.naturalWidth === 0) return
      const loop = width + CLOUD_MARGIN * 2
      const aspect = cloudImage.naturalHeight / cloudImage.naturalWidth
      for (const cloud of CLOUDS) {
        const offset = (cloud.x * loop - cloudScroll) % loop
        const x = (offset < 0 ? offset + loop : offset) - CLOUD_MARGIN
        ctx.globalAlpha = cloud.alpha
        ctx.drawImage(cloudImage, x, cloud.y * groundY, cloud.width, cloud.width * aspect)
      }
      ctx.globalAlpha = 1
    }

    const drawGround = (width: number, height: number, groundY: number) => {
      ctx.fillStyle = colors.groundFill
      ctx.fillRect(0, groundY, width, height - groundY)
      ctx.fillStyle = colors.groundTexture
      const tickY = groundY + GROUND_EDGE_HEIGHT + SCALLOP_DEPTH + 6 * SCALE
      for (let x = -groundScroll; x < width; x += TICK_SPACING) {
        ctx.fillRect(x, tickY, 2 * SCALE, TICK_LENGTH)
      }
      // The bright edge strip with scallops, as in GameCanvas.
      const base = groundY + GROUND_EDGE_HEIGHT
      ctx.fillStyle = colors.accent
      ctx.fillRect(0, groundY, width, GROUND_EDGE_HEIGHT)
      ctx.beginPath()
      ctx.moveTo(-groundScroll, base)
      for (let x = -groundScroll; x < width - 0.5; x += SCALLOP_WIDTH) {
        ctx.quadraticCurveTo(x + SCALLOP_WIDTH / 2, base + SCALLOP_DEPTH * 2, x + SCALLOP_WIDTH, base)
      }
      ctx.fill()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.fillRect(0, groundY, width, 1)
    }

    const drawBug = (obstacle: SymbolObstacle) => {
      if (!bugImage.complete || bugImage.naturalWidth === 0) {
        ctx.fillStyle = colors.danger
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
        return
      }
      const scale = Math.min(obstacle.width / bugImage.naturalWidth, obstacle.height / bugImage.naturalHeight)
      const width = bugImage.naturalWidth * scale
      const height = bugImage.naturalHeight * scale
      ctx.drawImage(bugImage, obstacle.x + (obstacle.width - width) / 2, obstacle.y + obstacle.height - height, width, height)
    }

    /** The character tile above a bug. The target is bigger, outlined and gold, so color is never the only cue. */
    const drawTile = (obstacle: SymbolObstacle, isTarget: boolean) => {
      const size = SYMBOL_TILE_SIZE * (isTarget ? TARGET_TILE_SCALE : 1)
      const centerX = obstacle.x + obstacle.width / 2
      const bottom = obstacle.y - SYMBOL_TILE_GAP
      ctx.beginPath()
      ctx.roundRect(centerX - size / 2, bottom - size, size, size, SYMBOL_TILE_RADIUS)
      ctx.fillStyle = colors.surface
      ctx.fill()
      if (isTarget) {
        ctx.lineWidth = TARGET_OUTLINE_WIDTH
        ctx.strokeStyle = colors.accent
        ctx.stroke()
      }
      ctx.font = SYMBOL_FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isTarget ? colors.gold : colors.muted
      ctx.fillText(obstacle.symbol, centerX, bottom - size / 2)
    }

    const drawParticles = () => {
      for (const particle of particles) {
        if (particle.age >= BURST_LIFE) continue
        const t = particle.age / BURST_LIFE
        ctx.globalAlpha = 1 - t
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, BURST_RADIUS * (1 + t), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const drawMascot = (groundY: number) => {
      if (!mascotImage.complete || mascotImage.naturalWidth === 0) return
      const height = SPRITE_HEIGHT
      const width = height * (mascotImage.naturalWidth / mascotImage.naturalHeight)
      const bob = Math.abs(Math.sin(elapsedTime * BOB_RATE * Math.PI)) * BOB_HEIGHT
      const centerX = MASCOT_X + MASCOT_SIZE / 2
      // Blink during grace. graceLeft runs on real time, so it freezes on pause.
      ctx.globalAlpha = graceLeft > 0 && Math.floor(graceLeft / BLINK_STEP) % 2 === 0 ? BLINK_DIM : 1
      ctx.drawImage(mascotImage, centerX - width * SPRITE_BODY_CENTER_X, groundY - bob - height, width, height)
      ctx.globalAlpha = 1
    }

    const drawFlash = (width: number, height: number) => {
      if (flashLeft <= 0) return
      ctx.globalAlpha = flashAlpha * (flashLeft / WRONG_FLASH_DURATION)
      ctx.fillStyle = colors.danger
      ctx.fillRect(0, 0, width, FLASH_EDGE)
      ctx.fillRect(0, height - FLASH_EDGE, width, FLASH_EDGE)
      ctx.fillRect(0, FLASH_EDGE, FLASH_EDGE, height - FLASH_EDGE * 2)
      ctx.fillRect(width - FLASH_EDGE, FLASH_EDGE, FLASH_EDGE, height - FLASH_EDGE * 2)
      ctx.globalAlpha = 1
    }

    const drawLayoutHint = (width: number, groundY: number) => {
      if (layoutHintLeft <= 0) return
      ctx.font = `600 ${9 * SCALE}px Inter, ui-sans-serif, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = colors.muted
      // Below the score bar, in the upper sky.
      ctx.fillText(LAYOUT_HINT, width / 2, Math.min(groundY * 0.3, 70 * SCALE))
    }

    const draw = () => {
      const scale = (window.devicePixelRatio || 1) * viewScale()
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      const width = SYNTAX_VIEW_WIDTH
      const height = worldHeight()
      const groundY = getGroundY()

      ctx.fillStyle = skyGradient ?? colors.skyBottom
      ctx.fillRect(0, 0, width, groundY)
      drawClouds(width, groundY)
      drawGround(width, height, groundY)

      const target = findTarget(obstacles)
      for (const obstacle of obstacles) drawBug(obstacle)
      // Tiles only for bugs fully on screen: those are the only ones you can type.
      for (const obstacle of visibleObstacles(obstacles)) drawTile(obstacle, obstacle === target)

      drawParticles()
      drawMascot(groundY)
      drawFlash(width, height)
      drawLayoutHint(width, groundY)
    }

    // --- Loop (same as GameCanvas) ---
    let frameId = 0
    const frame = (time: number) => {
      const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT)
      lastTime = time
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
    }
  }, [])

  // The HUD carries everything a screen reader needs; the canvas is decoration.
  return <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
}
