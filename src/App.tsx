import { GameCanvas } from './features/game/GameCanvas'
import { GameOverScreen } from './features/game/GameOverScreen'
import { Hud } from './features/game/Hud'
import { MainMenu } from './features/game/MainMenu'
import { useGameStore } from './store/gameStore'
import { SyntaxRushCanvas } from './features/game/SyntaxRushCanvas'
import { SyntaxRushGameOver } from './features/game/SyntaxRushGameOver'
import { SyntaxRushHud } from './features/game/SyntaxRushHud'

function App() {
  // Only the status is read here, so score updates never re-render the app.
  const status = useGameStore((state) => state.status)
  const inRun = status === 'playing' || status === 'paused'
  // Which mode's screens to show (spec 0002). Only read during a run or on game over.
  const mode = useGameStore((state) => state.mode)
  const isSyntax = mode === 'syntax'

  return (
    <main className="h-full bg-canvas font-sans text-ink">
      {status === 'menu' && <MainMenu />}
      {inRun && (
        // The run fills the whole viewport. The game world is drawn at SCALE
        // (constants/game.ts), so it reads well on a large screen.
        <div className="relative h-full">
          {!isSyntax && <GameCanvas />}
          {!isSyntax && <Hud />}
          {isSyntax && <SyntaxRushCanvas />}
          {isSyntax && <SyntaxRushHud />}
        </div>
      )}
      {status === 'gameover' && !isSyntax && <GameOverScreen />}
      {status === 'gameover' && isSyntax && <SyntaxRushGameOver />}
    </main>
  )
}

export default App
