import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '@/hooks/useStore'
import { HomeScreen } from '@/components/screens/HomeScreen'
import { MesaScreen } from '@/components/screens/MesaScreen'
import { NewMatchScreen } from '@/components/screens/NewMatchScreen'
import { GameScreen } from '@/components/screens/GameScreen'
import { WinScreen } from '@/components/screens/WinScreen'
import { HistorialScreen } from '@/components/screens/HistorialScreen'
import { detectRoundMode } from '@/utils/scoring'

type Route = 'home' | 'mesa' | 'new' | 'game' | 'win' | 'historial'

export default function App() {
  const store = useStore()
  const { activeMatch } = store

  const [route, setRoute] = useState<Route>(() => {
    if (activeMatch?.winner) return 'win'
    if (activeMatch) return 'game'
    return 'home'
  })

  // Sync screen with match state
  useEffect(() => {
    if (activeMatch?.winner && route === 'game') setRoute('win')
    if (!activeMatch && (route === 'game' || route === 'win')) setRoute('home')
  }, [activeMatch, route])

  return (
    <AnimatePresence mode="wait">
      {route === 'home' && (
        <HomeScreen
          key="home"
          hasActiveMatch={!!activeMatch && !activeMatch.winner}
          rosterSize={store.activeRoster.length}
          matchCount={store.finishedMatches.length}
          onContinue={() => setRoute('game')}
          onNewMatch={() => setRoute('new')}
          onMesa={() => setRoute('mesa')}
          onHistorial={() => setRoute('historial')}
        />
      )}

      {route === 'mesa' && (
        <MesaScreen
          key="mesa"
          active={store.activeRoster}
          retired={store.retiredRoster}
          onBack={() => setRoute('home')}
          onAdd={(name) => { store.addPlayer(name) }}
          onRename={store.renamePlayer}
          onRetire={store.retirePlayer}
          onRestore={store.restorePlayer}
          onDelete={store.removePlayer}
        />
      )}

      {route === 'new' && (
        <NewMatchScreen
          key="new"
          roster={store.activeRoster}
          defaultTeamNames={['Nosotros', 'Ellos']}
          onAddPlayer={store.addPlayer}
          onBack={() => setRoute('home')}
          onStart={(a, b) => {
            store.startMatch(a, b)
            setRoute('game')
          }}
        />
      )}

      {route === 'game' && activeMatch && !activeMatch.winner && (
        <GameScreen
          key="game"
          match={activeMatch}
          playerById={store.playerById}
          onScore={(team, points, reason) =>
            store.score({
              team,
              points,
              reason,
              roundMode: detectRoundMode(activeMatch.scoreA, activeMatch.scoreB),
            })
          }
          onUndo={store.undo}
          onAbandon={() => { store.abandonMatch(); setRoute('home') }}
        />
      )}

      {route === 'win' && activeMatch?.winner && (
        <WinScreen
          key="win"
          match={activeMatch}
          playerById={store.playerById}
          onHome={() => { store.finishMatch(); setRoute('home') }}
          onRevancha={() => {
            const a = activeMatch.teamA
            const b = activeMatch.teamB
            // Swap which team starts as A so loser "sale primero"
            const wasWinnerA = activeMatch.winner === 'A'
            store.finishMatch()
            store.startMatch(
              wasWinnerA ? b : a,
              wasWinnerA ? a : b,
            )
            setRoute('game')
          }}
        />
      )}

      {route === 'historial' && (
        <HistorialScreen
          key="historial"
          matches={store.state.matches}
          roster={store.state.roster}
          playerById={store.playerById}
          onBack={() => setRoute('home')}
          onDeleteMatch={store.deleteMatch}
        />
      )}
    </AnimatePresence>
  )
}
