import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type AppState,
  type Match,
  type Player,
  type ScoreEvent,
  INITIAL_STATE,
} from '@/types/game'
import { applyEvent, undoLastEvent } from '@/utils/scoring'

const STORAGE_KEY = 'truco:v2'
const LEGACY_KEYS = ['truco_active_game', 'truco_history']

function makeId(): string {
  // ULID-ish: timestamp + random base36, sortable
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadInitial(): AppState {
  if (typeof window === 'undefined') return INITIAL_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.schemaVersion === 2) return parsed
    }
    // First launch on v2: discard legacy v1 keys (silent migration).
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore corrupt state */
  }
  return INITIAL_STATE
}

export function useStore() {
  const [state, setState] = useState<AppState>(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* quota / private mode */
    }
  }, [state])

  // ─── Roster ──────────────────────────────────────────────────
  const addPlayer = useCallback((name: string): Player => {
    const trimmed = name.trim()
    const player: Player = {
      id: makeId(),
      name: trimmed,
      joinedAt: Date.now(),
    }
    setState((s) => ({ ...s, roster: [...s.roster, player] }))
    return player
  }, [])

  const renamePlayer = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)),
    }))
  }, [])

  const retirePlayer = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => (p.id === id ? { ...p, retiredAt: Date.now() } : p)),
    }))
  }, [])

  const restorePlayer = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => {
        if (p.id !== id) return p
        const { retiredAt, ...rest } = p
        void retiredAt
        return rest
      }),
    }))
  }, [])

  const removePlayer = useCallback((id: string) => {
    // Hard delete — only allowed if not used in any match.
    setState((s) => {
      const used = s.matches.some(
        (m) => m.teamA.playerIds.includes(id) || m.teamB.playerIds.includes(id),
      )
      if (used) return { ...s, roster: s.roster.map((p) => (p.id === id ? { ...p, retiredAt: Date.now() } : p)) }
      return { ...s, roster: s.roster.filter((p) => p.id !== id) }
    })
  }, [])

  // ─── Match lifecycle ────────────────────────────────────────
  const startMatch = useCallback(
    (
      teamA: { name: string; playerIds: string[] },
      teamB: { name: string; playerIds: string[] },
    ): Match => {
      const m: Match = {
        id: makeId(),
        startedAt: Date.now(),
        finishedAt: null,
        teamA,
        teamB,
        scoreA: 0,
        scoreB: 0,
        events: [],
        winner: null,
      }
      setState((s) => ({
        ...s,
        matches: [m, ...s.matches],
        activeMatchId: m.id,
      }))
      return m
    },
    [],
  )

  const score = useCallback((ev: Omit<ScoreEvent, 'at'>) => {
    setState((s) => {
      if (!s.activeMatchId) return s
      return {
        ...s,
        matches: s.matches.map((m) =>
          m.id === s.activeMatchId ? applyEvent(m, { ...ev, at: Date.now() }) : m,
        ),
      }
    })
  }, [])

  const undo = useCallback(() => {
    setState((s) => {
      if (!s.activeMatchId) return s
      return {
        ...s,
        matches: s.matches.map((m) =>
          m.id === s.activeMatchId ? undoLastEvent(m) : m,
        ),
      }
    })
  }, [])

  const finishMatch = useCallback(() => {
    setState((s) => ({ ...s, activeMatchId: null }))
  }, [])

  const abandonMatch = useCallback(() => {
    setState((s) => {
      if (!s.activeMatchId) return s
      return {
        ...s,
        activeMatchId: null,
        matches: s.matches.map((m) =>
          m.id === s.activeMatchId
            ? { ...m, abandoned: true, finishedAt: Date.now() }
            : m,
        ),
      }
    })
  }, [])

  const deleteMatch = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      matches: s.matches.filter((m) => m.id !== id),
      activeMatchId: s.activeMatchId === id ? null : s.activeMatchId,
    }))
  }, [])

  const clearAll = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  // ─── Selectors ──────────────────────────────────────────────
  const activeMatch = useMemo<Match | null>(
    () => (state.activeMatchId ? state.matches.find((m) => m.id === state.activeMatchId) ?? null : null),
    [state.activeMatchId, state.matches],
  )

  const activeRoster = useMemo(() => state.roster.filter((p) => !p.retiredAt), [state.roster])
  const retiredRoster = useMemo(() => state.roster.filter((p) => !!p.retiredAt), [state.roster])

  const playerById = useCallback(
    (id: string) => state.roster.find((p) => p.id === id),
    [state.roster],
  )

  const finishedMatches = useMemo(
    () => state.matches.filter((m) => m.finishedAt !== null && !m.abandoned && m.winner !== null),
    [state.matches],
  )

  return {
    state,
    activeMatch,
    activeRoster,
    retiredRoster,
    finishedMatches,
    playerById,
    // roster
    addPlayer,
    renamePlayer,
    retirePlayer,
    restorePlayer,
    removePlayer,
    // match
    startMatch,
    score,
    undo,
    finishMatch,
    abandonMatch,
    deleteMatch,
    clearAll,
  }
}

export type Store = ReturnType<typeof useStore>
