import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '@/hooks/useStore'
import { useWakeLock } from '@/hooks/useWakeLock'
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

// Restore the last route across reloads so a refresh lands the user
// back where they were. The mid-session sync effect below still
// kicks them out of `game` / `win` if the active match no longer
// exists, so a stale value can't strand them on an empty screen.
const ROUTE_KEY = 'truco.route.v1'
const ROUTES: Route[] = ['home', 'mesa', 'new', 'game', 'win', 'historial']
function readSavedRoute(): Route {
  if (typeof window === 'undefined') return 'home'
  try {
    const v = window.localStorage.getItem(ROUTE_KEY)
    return v && (ROUTES as string[]).includes(v) ? (v as Route) : 'home'
  } catch {
    return 'home'
  }
}

export default function App() {
  const store = useStore()
  const { activeMatch, loading, error } = store

  const [route, setRoute] = useState<Route>(readSavedRoute)

  // Hold the screen awake while a match is on screen — the phone lives
  // face-up on the table and only gets touched between manos.
  useWakeLock(route === 'game' || route === 'win')

  // Persist route changes so a refresh comes back to the same screen.
  useEffect(() => {
    try { window.localStorage.setItem(ROUTE_KEY, route) } catch { /* private mode etc. */ }
  }, [route])

  // No auto-jump into a live match from home. It used to pull you into
  // `game` whenever an active match existed, and since `route` was a
  // dependency it re-fired every time you landed on home — so leaving a
  // match in progress was impossible, and a guest who only wanted to
  // read the stats got dragged into the scoreboard. Resuming is covered
  // without it: the scorer's route is persisted, so reopening the app
  // puts them back where they were, and anyone on home gets the live
  // card to tap back in.

  // Sync screen with match state mid-session. Also covers the
  // "restored route is `game` / `win` but the match was deleted
  // remotely" case — we kick back to home rather than rendering an
  // empty screen.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeMatch?.winner && route === 'game') setRoute('win')
    if (!activeMatch && (route === 'game' || route === 'win')) setRoute('home')
  }, [activeMatch, route])

  if (loading) {
    return (
      <div className="fixed inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-1.5 rounded-full bg-accent animate-pulse" />
          <p className="eyebrow">Conectando</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 grid place-items-center px-6 text-center">
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
          activeMatch={activeMatch && !activeMatch.winner ? activeMatch : null}
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
          user={store.user}
          onSwitchMesa={store.switchMesa}
          onBack={() => setRoute('home')}
          onAdd={(name) => { store.addPlayer(name) }}
          onRetire={store.retirePlayer}
          onRestore={store.restorePlayer}
          onDelete={store.removePlayer}
          onWipe={store.clearAll}
          onUpdatePlayer={store.updatePlayer}
          onSetPhoto={store.setPlayerPhoto}
          onRemovePhoto={store.removePlayerPhoto}
          onClaim={store.claimPlayer}
          onUnclaim={store.unclaimPlayer}
          onSignIn={store.signInWithEmail}
          onSignOut={store.signOut}
        />
      )}

      {route === 'new' && (
        <NewMatchScreen
          key="new"
          roster={store.activeRoster}
          defaultTeamNames={['Nosotros', 'Ellos']}
          onAddPlayer={store.addPlayer}
          onBack={() => setRoute('home')}
          onStart={(a, b, seats) => {
            store.startMatch(a, b, seats)
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
          onLeave={() => setRoute('home')}
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
            // Keep the same left/right layout across a rematch so the
            // scorer's mental model ("Nosotros left, Ellos right")
            // doesn't flip mid-night. Who "sale primero" is a truco
            // convention, but the scoreboard side ordering is a UI
            // stability concern that wins here.
            store.startMatch(activeMatch.teamA, activeMatch.teamB)
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
