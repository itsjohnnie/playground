import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '@/hooks/useGame'
import type { GameMode } from '@/types/game'
import { HomeScreen } from '@/components/screens/HomeScreen'
import { SetupScreen } from '@/components/screens/SetupScreen'
import { GameScreen } from '@/components/screens/GameScreen'
import { WinScreen } from '@/components/screens/WinScreen'

type Screen = 'home' | 'setup' | 'game' | 'win'

const transition = { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const }
const variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -10 },
}

export default function App() {
  const { game, history, startGame, addScore, undoLast, finishGame, abandonGame, clearHistory } = useGame()

  const [screen, setScreen] = useState<Screen>(() => {
    if (game?.isFinished) return 'win'
    if (game) return 'game'
    return 'home'
  })

  function handleStartGame(mode: GameMode, teamNames: [string, string], playerNames: string[]) {
    startGame(mode, teamNames, playerNames)
    setScreen('game')
  }

  function handleScore(teamIndex: 0 | 1, points: number, reason: string) {
    addScore(teamIndex, points, reason)
  }

  // Sync screen with game state (after score updates)
  if (game?.isFinished && screen === 'game') setScreen('win')
  if (!game && (screen === 'game' || screen === 'win')) setScreen('home')

  return (
    <AnimatePresence mode="wait">
      {screen === 'home' && (
        <motion.div key="home" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition} className="flex-1">
          <HomeScreen
            history={history}
            hasActiveGame={!!game && !game.isFinished}
            onNewGame={() => setScreen('setup')}
            onContinue={() => setScreen('game')}
            onClearHistory={clearHistory}
          />
        </motion.div>
      )}

      {screen === 'setup' && (
        <motion.div key="setup" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition} className="flex-1">
          <SetupScreen onStart={handleStartGame} onBack={() => setScreen('home')} />
        </motion.div>
      )}

      {screen === 'game' && game && !game.isFinished && (
        <motion.div key="game" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition} className="flex-1 flex flex-col">
          <GameScreen
            game={game}
            onScore={handleScore}
            onUndo={undoLast}
            onAbandon={() => { abandonGame(); setScreen('home') }}
          />
        </motion.div>
      )}

      {screen === 'win' && game?.isFinished && (
        <motion.div key="win" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition} className="flex-1">
          <WinScreen game={game} onFinish={() => { finishGame(); setScreen('home') }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
