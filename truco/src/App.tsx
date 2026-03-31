import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from './hooks/useGame'
import type { GameMode } from './types/game'
import { HomeScreen } from './components/screens/HomeScreen'
import { SetupScreen } from './components/screens/SetupScreen'
import { GameScreen } from './components/screens/GameScreen'
import { WinScreen } from './components/screens/WinScreen'

type Screen = 'home' | 'setup' | 'game' | 'win'

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export default function App() {
  const { game, history, startGame, addScore, undoLast, finishGame, abandonGame, clearHistory } =
    useGame()

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
    // Check for win after state update — we read from game on next render
    // The useEffect below handles screen transition
  }

  function handleFinish() {
    finishGame()
    setScreen('home')
  }

  function handleAbandon() {
    abandonGame()
    setScreen('home')
  }

  // Sync screen with game state
  if (game?.isFinished && screen === 'game') {
    setScreen('win')
  }
  if (!game && screen === 'game') {
    setScreen('home')
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'home' && (
        <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit">
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
        <motion.div key="setup" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <SetupScreen
            onStart={handleStartGame}
            onBack={() => setScreen('home')}
          />
        </motion.div>
      )}

      {screen === 'game' && game && !game.isFinished && (
        <motion.div key="game" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <GameScreen
            game={game}
            onScore={handleScore}
            onUndo={undoLast}
            onAbandon={handleAbandon}
          />
        </motion.div>
      )}

      {screen === 'win' && game && game.isFinished && (
        <motion.div key="win" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <WinScreen game={game} onFinish={handleFinish} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
