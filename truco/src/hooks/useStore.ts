import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AppState,
  type Match,
  type Player,
  type ScoreEvent,
  type ScoreReason,
  INITIAL_STATE,
  MAX_SCORE,
} from '@/types/game'
import {
  supabase,
  type PlayerRow,
  type MatchRow,
  type EventRow,
  type AppStateRow,
} from '@/lib/supabase'

// ─── Row → model converters ─────────────────────────────────────

function rowToPlayer(r: PlayerRow): Player {
  return {
    id: r.id,
    name: r.name,
    joinedAt: new Date(r.joined_at).getTime(),
    retiredAt: r.retired_at ? new Date(r.retired_at).getTime() : undefined,
  }
}

function rowToMatch(m: MatchRow, events: EventRow[]): Match {
  return {
    id: m.id,
    startedAt: new Date(m.started_at).getTime(),
    finishedAt: m.finished_at ? new Date(m.finished_at).getTime() : null,
    teamA: { name: m.team_a_name, playerIds: m.team_a_player_ids },
    teamB: { name: m.team_b_name, playerIds: m.team_b_player_ids },
    scoreA: m.score_a,
    scoreB: m.score_b,
    winner: m.winner,
    abandoned: m.abandoned ? true : undefined,
    events: events
      .filter((e) => e.match_id === m.id)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .map((e) => ({
        team: e.team,
        points: e.points,
        reason: e.reason as ScoreReason,
        roundMode: e.round_mode,
        at: new Date(e.at).getTime(),
      })),
  }
}

// ─── ID helper ─────────────────────────────────────────────────

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ─── Hook ──────────────────────────────────────────────────────

export function useStore() {
  const [state, setState] = useState<AppState>(INITIAL_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cache raw event rows separately so we can rebuild Match.events on
  // partial updates (e.g. when a single event arrives over realtime).
  const eventsRef = useRef<EventRow[]>([])

  // ── Initial load ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      setError(null)
      try {
        const [pRes, mRes, eRes, aRes] = await Promise.all([
          supabase.from('players').select('*'),
          supabase.from('matches').select('*').order('started_at', { ascending: false }),
          supabase.from('events').select('*'),
          supabase.from('app_state').select('*').eq('id', 'singleton').maybeSingle(),
        ])
        if (cancelled) return
        if (pRes.error) throw pRes.error
        if (mRes.error) throw mRes.error
        if (eRes.error) throw eRes.error
        if (aRes.error) throw aRes.error

        const playerRows = (pRes.data ?? []) as PlayerRow[]
        const matchRows = (mRes.data ?? []) as MatchRow[]
        const eventRows = (eRes.data ?? []) as EventRow[]
        const appRow = aRes.data as AppStateRow | null

        eventsRef.current = eventRows
        setState({
          schemaVersion: 2,
          roster: playerRows.map(rowToPlayer),
          matches: matchRows.map((m) => rowToMatch(m, eventRows)),
          activeMatchId: appRow?.active_match_id ?? null,
        })
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError((e as Error).message)
        setLoading(false)
      }
    }
    load()

    // ── Realtime subscriptions ─────────────────────────────────
    const channel = supabase
      .channel('truco-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
        setState((s) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = rowToPlayer(payload.new as PlayerRow)
            const exists = s.roster.some((x) => x.id === p.id)
            return {
              ...s,
              roster: exists ? s.roster.map((x) => (x.id === p.id ? p : x)) : [...s.roster, p],
            }
          }
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as PlayerRow).id
            return { ...s, roster: s.roster.filter((x) => x.id !== id) }
          }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
        setState((s) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as MatchRow
            const m = rowToMatch(row, eventsRef.current)
            const exists = s.matches.some((x) => x.id === m.id)
            const next = exists
              ? s.matches.map((x) => (x.id === m.id ? m : x))
              : [m, ...s.matches]
            // Keep newest first
            return { ...s, matches: next.sort((a, b) => b.startedAt - a.startedAt) }
          }
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as MatchRow).id
            return { ...s, matches: s.matches.filter((x) => x.id !== id) }
          }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as EventRow
          // Dedupe in case of optimistic + echo
          if (!eventsRef.current.some((e) => e.id === row.id)) {
            eventsRef.current = [...eventsRef.current, row]
          }
          setState((s) => ({
            ...s,
            matches: s.matches.map((m) =>
              m.id === row.match_id ? rowToMatch(matchToRow(m), eventsRef.current) : m,
            ),
          }))
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as EventRow
          eventsRef.current = eventsRef.current.filter((e) => e.id !== old.id)
          setState((s) => ({
            ...s,
            matches: s.matches.map((m) =>
              m.id === old.match_id ? rowToMatch(matchToRow(m), eventsRef.current) : m,
            ),
          }))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state' }, (payload) => {
        const row = payload.new as AppStateRow
        setState((s) => ({ ...s, activeMatchId: row.active_match_id ?? null }))
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Mutations ────────────────────────────────────────────────

  const addPlayer = useCallback((name: string): Player => {
    const trimmed = name.trim()
    const player: Player = {
      id: makeId(),
      name: trimmed,
      joinedAt: Date.now(),
    }
    // Optimistic local update
    setState((s) => ({ ...s, roster: [...s.roster, player] }))
    // Server write
    supabase
      .from('players')
      .insert({ id: player.id, name: trimmed })
      .then(({ error: e }) => {
        if (e) console.error('addPlayer', e)
      })
    return player
  }, [])

  const renamePlayer = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
    }))
    supabase
      .from('players')
      .update({ name: trimmed })
      .eq('id', id)
      .then(({ error: e }) => { if (e) console.error('renamePlayer', e) })
  }, [])

  const retirePlayer = useCallback((id: string) => {
    const now = Date.now()
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => (p.id === id ? { ...p, retiredAt: now } : p)),
    }))
    supabase
      .from('players')
      .update({ retired_at: new Date(now).toISOString() })
      .eq('id', id)
      .then(({ error: e }) => { if (e) console.error('retirePlayer', e) })
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
    supabase
      .from('players')
      .update({ retired_at: null })
      .eq('id', id)
      .then(({ error: e }) => { if (e) console.error('restorePlayer', e) })
  }, [])

  const removePlayer = useCallback((id: string) => {
    setState((s) => {
      const used = s.matches.some(
        (m) => m.teamA.playerIds.includes(id) || m.teamB.playerIds.includes(id),
      )
      if (used) {
        // Soft-delete: keep history intact
        const now = Date.now()
        supabase
          .from('players')
          .update({ retired_at: new Date(now).toISOString() })
          .eq('id', id)
          .then(({ error: e }) => { if (e) console.error('removePlayer/retire', e) })
        return { ...s, roster: s.roster.map((p) => (p.id === id ? { ...p, retiredAt: now } : p)) }
      }
      supabase
        .from('players')
        .delete()
        .eq('id', id)
        .then(({ error: e }) => { if (e) console.error('removePlayer', e) })
      return { ...s, roster: s.roster.filter((p) => p.id !== id) }
    })
  }, [])

  // ── Match lifecycle ──────────────────────────────────────────

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
      ;(async () => {
        const { error: e1 } = await supabase.from('matches').insert({
          id: m.id,
          team_a_name: teamA.name,
          team_a_player_ids: teamA.playerIds,
          team_b_name: teamB.name,
          team_b_player_ids: teamB.playerIds,
        })
        if (e1) { console.error('startMatch/insert', e1); return }
        const { error: e2 } = await supabase
          .from('app_state')
          .update({ active_match_id: m.id })
          .eq('id', 'singleton')
        if (e2) console.error('startMatch/active', e2)
      })()
      return m
    },
    [],
  )

  const score = useCallback((ev: Omit<ScoreEvent, 'at'>) => {
    setState((s) => {
      if (!s.activeMatchId) return s
      const matchId = s.activeMatchId
      const updated = s.matches.map((m) => {
        if (m.id !== matchId) return m
        const newA = ev.team === 'A' ? Math.min(m.scoreA + ev.points, MAX_SCORE) : m.scoreA
        const newB = ev.team === 'B' ? Math.min(m.scoreB + ev.points, MAX_SCORE) : m.scoreB
        const finished = newA >= MAX_SCORE || newB >= MAX_SCORE
        const winner: 'A' | 'B' | null = finished
          ? newA >= MAX_SCORE ? 'A' : 'B'
          : null
        return {
          ...m,
          scoreA: newA,
          scoreB: newB,
          winner,
          finishedAt: finished ? Date.now() : null,
          events: [...m.events, { ...ev, at: Date.now() }],
        }
      })
      const m = updated.find((x) => x.id === matchId)!
      // Persist
      ;(async () => {
        const { error: e1 } = await supabase.from('events').insert({
          match_id: matchId,
          team: ev.team,
          points: ev.points,
          reason: ev.reason,
          round_mode: ev.roundMode,
        })
        if (e1) { console.error('score/event', e1); return }
        const { error: e2 } = await supabase
          .from('matches')
          .update({
            score_a: m.scoreA,
            score_b: m.scoreB,
            winner: m.winner,
            finished_at: m.finishedAt ? new Date(m.finishedAt).toISOString() : null,
          })
          .eq('id', matchId)
        if (e2) console.error('score/match', e2)
      })()
      return { ...s, matches: updated }
    })
  }, [])

  const undo = useCallback(() => {
    setState((s) => {
      if (!s.activeMatchId) return s
      const matchId = s.activeMatchId
      const m = s.matches.find((x) => x.id === matchId)
      if (!m || m.events.length === 0) return s
      const last = m.events[m.events.length - 1]
      const newA = last.team === 'A' ? Math.max(0, m.scoreA - last.points) : m.scoreA
      const newB = last.team === 'B' ? Math.max(0, m.scoreB - last.points) : m.scoreB
      const updatedMatch: Match = {
        ...m,
        scoreA: newA,
        scoreB: newB,
        winner: null,
        finishedAt: null,
        events: m.events.slice(0, -1),
      }
      // Persist: delete the latest event row, then update match
      ;(async () => {
        const { data, error: e1 } = await supabase
          .from('events')
          .select('id')
          .eq('match_id', matchId)
          .order('at', { ascending: false })
          .limit(1)
        if (e1) { console.error('undo/find', e1); return }
        const lastId = data?.[0]?.id
        if (lastId !== undefined) {
          const { error: eDel } = await supabase.from('events').delete().eq('id', lastId)
          if (eDel) { console.error('undo/delete', eDel); return }
        }
        const { error: e2 } = await supabase
          .from('matches')
          .update({
            score_a: newA, score_b: newB, winner: null, finished_at: null,
          })
          .eq('id', matchId)
        if (e2) console.error('undo/match', e2)
      })()
      return {
        ...s,
        matches: s.matches.map((x) => (x.id === matchId ? updatedMatch : x)),
      }
    })
  }, [])

  const finishMatch = useCallback(() => {
    setState((s) => ({ ...s, activeMatchId: null }))
    supabase
      .from('app_state')
      .update({ active_match_id: null })
      .eq('id', 'singleton')
      .then(({ error: e }) => { if (e) console.error('finishMatch', e) })
  }, [])

  const abandonMatch = useCallback(() => {
    setState((s) => {
      if (!s.activeMatchId) return s
      const matchId = s.activeMatchId
      ;(async () => {
        const { error: e1 } = await supabase
          .from('matches')
          .update({ abandoned: true, finished_at: new Date().toISOString() })
          .eq('id', matchId)
        if (e1) console.error('abandonMatch/match', e1)
        const { error: e2 } = await supabase
          .from('app_state')
          .update({ active_match_id: null })
          .eq('id', 'singleton')
        if (e2) console.error('abandonMatch/active', e2)
      })()
      return {
        ...s,
        activeMatchId: null,
        matches: s.matches.map((m) =>
          m.id === matchId ? { ...m, abandoned: true, finishedAt: Date.now() } : m,
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
    supabase
      .from('matches')
      .delete()
      .eq('id', id)
      .then(({ error: e }) => { if (e) console.error('deleteMatch', e) })
  }, [])

  const clearAll = useCallback(async () => {
    await Promise.all([
      supabase.from('events').delete().neq('id', 0),
      supabase.from('matches').delete().neq('id', ''),
      supabase.from('players').delete().neq('id', ''),
      supabase.from('app_state').update({ active_match_id: null }).eq('id', 'singleton'),
    ])
    eventsRef.current = []
    setState(INITIAL_STATE)
  }, [])

  // ── Selectors ────────────────────────────────────────────────
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
    loading,
    error,
    activeMatch,
    activeRoster,
    retiredRoster,
    finishedMatches,
    playerById,
    addPlayer,
    renamePlayer,
    retirePlayer,
    restorePlayer,
    removePlayer,
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

// ─── Helpers ───────────────────────────────────────────────────
// Convert an in-memory Match back to a MatchRow shape for rebuilds
// after an event-only realtime push.
function matchToRow(m: Match): MatchRow {
  return {
    id: m.id,
    started_at: new Date(m.startedAt).toISOString(),
    finished_at: m.finishedAt ? new Date(m.finishedAt).toISOString() : null,
    team_a_name: m.teamA.name,
    team_a_player_ids: m.teamA.playerIds,
    team_b_name: m.teamB.name,
    team_b_player_ids: m.teamB.playerIds,
    score_a: m.scoreA,
    score_b: m.scoreB,
    winner: m.winner,
    abandoned: !!m.abandoned,
  }
}

