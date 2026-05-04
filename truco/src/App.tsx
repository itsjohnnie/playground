import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '@/hooks/useStore'
import { HomeScreen } from '@/components/screens/HomeScreen'
import { MesaScreen } from '@/components/screens/MesaScreen'
import { NewMatchScreen } from '@/components/screens/NewMatchScreen'
import { GameScreen } from '@/components/screens/GameScreen'
import { WinScreen } from '@/components/screens/WinScreen'
import { ToastHost } from '@/components/ui/ToastHost'
import { detectRoundMode } from '@/utils/scoring'

const HistorialScreen = lazy(() =>
  import('@/components/screens/HistorialScreen').then((m) => ({ default: m.HistorialScreen })),
)

type Route = 'home' | 'mesa' | 'new' | 'game' | 'win' | 'historial'

export default function App() {
  const store = useStore()
  const { activeMatch, loading, error } = store

  const [route, setRoute] = useState<Route>('home')

  // Once loaded, jump into an active match if there is one.
  useEffect(() => {
    if (loading) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeMatch?.winner && route === 'home') setRoute('win')
    else if (activeMatch && !activeMatch.winner && route === 'home') setRoute('game')
  }, [loading, activeMatch, route])

  // Sync screen with match state mid-session
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeMatch?.winner && route === 'game') setRoute('win')
    if (!activeMatch && (route === 'game' || route === 'win')) setRoute('home')
  }, [activeMatch, route])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-1.5 rounded-full bg-accent animate-pulse" />
          <p className="eyebrow">Conectando</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <div className="flex flex-col items-center gap-3 max-w-xs">
          <p className="eyebrow text-danger">Sin conexión</p>
          <p className="text-ink-muted text-sm">{error}</p>
          <button
            onClick={() => location.reload()}
            className="pressable mt-2 rounded-sm border border-line bg-surface-hi px-4 py-2 text-sm text-ink"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
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
          mesa={store.mesa}
          onSwitchMesa={store.switchMesa}
          onBack={() => setRoute('home')}
          onAdd={(name) => { store.addPlayer(name) }}
          onRename={store.renamePlayer}
          onRetire={store.retirePlayer}
          onRestore={store.restorePlayer}
          onDelete={store.removePlayer}
          onWipe={store.clearAll}
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
        <Suspense
          key="historial"
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <div className="size-1.5 rounded-full bg-accent animate-pulse" />
            </div>
          }
        >
          <HistorialScreen
            matches={store.state.matches}
            roster={store.state.roster}
            playerById={store.playerById}
            onBack={() => setRoute('home')}
            onDeleteMatch={store.deleteMatch}
          />
        </Suspense>
      )}
    </AnimatePresence>
    <ToastHost />
    </>
  )
}
