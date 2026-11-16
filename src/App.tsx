import { GameCanvas } from './features/game/GameCanvas'
import { GameOverScreen } from './features/game/GameOverScreen'
import { Hud } from './features/game/Hud'
import { MainMenu } from './features/game/MainMenu'
import { useGameStore } from './store/gameStore'

function App() {
  // Only the status is read here, so score updates never re-render the app.
  const status = useGameStore((state) => state.status)
  const inRun = status === 'playing' || status === 'paused'

  return (
    <main className="h-full bg-canvas font-sans text-ink">
      {status === 'menu' && <MainMenu />}
      {inRun && (
        // The run fills the whole viewport. The game world is drawn at SCALE
        // (constants/game.ts), so it reads well on a large screen.
        <div className="relative h-full">
          <GameCanvas />
          <Hud />
        </div>
      )}
      {status === 'gameover' && <GameOverScreen />}
    </main>
  )
}

export default App
