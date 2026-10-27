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
// kicks them out of `game` / `win` if that match no longer exists, so
// a stale value can't strand them on an empty screen.
//
// The match id rides along with the route now. Several matches can be
// live at once — eight people split into two tables — so "which one
// is this phone scoring" is this phone's business, not shared state.
// Two devices on two different tables each keep their own.
const ROUTE_KEY = 'truco.route.v2'
const ROUTES: Route[] = ['home', 'mesa', 'new', 'game', 'win', 'historial']

interface SavedRoute { route: Route; matchId: string | null }

function readSavedRoute(): SavedRoute {
  const fallback: SavedRoute = { route: 'home', matchId: null }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(ROUTE_KEY)
    if (!raw) return fallback
    const v = JSON.parse(raw) as Partial<SavedRoute>
    if (!v.route || !(ROUTES as string[]).includes(v.route)) return fallback
    return {
      route: v.route,
      matchId: typeof v.matchId === 'string' ? v.matchId : null,
    }
  } catch {
    // Unparseable, or storage blocked in private mode.
    return fallback
  }
}

export default function App() {
  const store = useStore()
  const { liveMatches, matchById, loading, error } = store

  const saved = readSavedRoute()
  const [route, setRoute] = useState<Route>(saved.route)
  // The match this device is scoring. Null anywhere outside game / win.
  const [matchId, setMatchId] = useState<string | null>(saved.matchId)

  const currentMatch = matchId ? matchById(matchId) : null

  // Open a match on this device and go to its scoreboard.
  const openMatch = (id: string) => { setMatchId(id); setRoute('game') }
  // Step away from whatever match is on screen, without ending it.
  const leaveMatch = () => { setMatchId(null); setRoute('home') }

  // Hold the screen awake while a match is on screen — the phone lives
  // face-up on the table and only gets touched between manos.
  useWakeLock(route === 'game' || route === 'win')

  // Persist route changes so a refresh comes back to the same screen,
  // and to the same match when there's more than one in play.
  useEffect(() => {
    try {
      window.localStorage.setItem(ROUTE_KEY, JSON.stringify({ route, matchId }))
    } catch { /* private mode etc. */ }
  }, [route, matchId])

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
    if (currentMatch?.winner && route === 'game') setRoute('win')
    if (!currentMatch && (route === 'game' || route === 'win')) {
      setRoute('home')
      setMatchId(null)
    }
  }, [currentMatch, route])

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
          liveMatches={liveMatches}
          playerById={store.playerById}
          rosterSize={store.activeRoster.length}
          matchCount={store.finishedMatches.length}
          onContinue={openMatch}
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
          onStart={(a, b, seats) => openMatch(store.startMatch(a, b, seats).id)}
        />
      )}

      {route === 'game' && currentMatch && !currentMatch.winner && (
        <GameScreen
          key="game"
          match={currentMatch}
          playerById={store.playerById}
          onScore={(team, points, reason) =>
            store.score(currentMatch.id, {
              team,
              points,
              reason,
              roundMode: detectRoundMode(currentMatch.scoreA, currentMatch.scoreB),
            })
          }
          onUndo={() => store.undo(currentMatch.id)}
          onLeave={leaveMatch}
          onAbandon={() => { store.abandonMatch(currentMatch.id); leaveMatch() }}
        />
      )}

      {route === 'win' && currentMatch?.winner && (
        <WinScreen
          key="win"
          match={currentMatch}
          playerById={store.playerById}
          // The win already wrote `winner` and `finishedAt`, so there's
          // nothing left to close out — just step off the match.
          onHome={leaveMatch}
          onRevancha={() => {
            // Keep the same left/right layout across a rematch so the
            // scorer's mental model ("Nosotros left, Ellos right")
            // doesn't flip mid-night. Who "sale primero" is a truco
            // convention, but the scoreboard side ordering is a UI
            // stability concern that wins here.
            openMatch(store.startMatch(currentMatch.teamA, currentMatch.teamB).id)
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
