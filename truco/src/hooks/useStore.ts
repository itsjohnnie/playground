import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
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
import { execOp } from '@/lib/writeQueue'
import { getMesa, setMesa as persistMesa, makeMesaId, idBelongsToMesa } from '@/lib/mesa'
import { optimizeAvatar } from '@/lib/photoOptim'
import { toast } from '@/lib/toast'

// ── Profile patch shape ─────────────────────────────────────────
export interface PlayerProfilePatch {
  name?: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  venmo?: string | null
  zelle?: string | null
}

// camelCase → snake_case for Supabase update payloads.
function profilePatchToRow(patch: PlayerProfilePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.name !== undefined)      out.name = patch.name.trim()
  if (patch.firstName !== undefined) out.first_name = nullIfBlank(patch.firstName)
  if (patch.lastName !== undefined)  out.last_name  = nullIfBlank(patch.lastName)
  if (patch.phone !== undefined)     out.phone      = nullIfBlank(patch.phone)
  if (patch.venmo !== undefined)     out.venmo      = nullIfBlank(patch.venmo)
  if (patch.zelle !== undefined)     out.zelle      = nullIfBlank(patch.zelle)
  return out
}

function nullIfBlank(v: string | null): string | null {
  if (v === null) return null
  const t = v.trim()
  return t.length === 0 ? null : t
}

// ─── Row → model converters ─────────────────────────────────────

function rowToPlayer(r: PlayerRow): Player {
  return {
    id: r.id,
    name: r.name,
    joinedAt: new Date(r.joined_at).getTime(),
    retiredAt: r.retired_at ? new Date(r.retired_at).getTime() : undefined,
    firstName: r.first_name ?? undefined,
    lastName:  r.last_name  ?? undefined,
    phone:     r.phone      ?? undefined,
    photoUrl:  r.photo_url  ?? undefined,
    venmo:     r.venmo      ?? undefined,
    zelle:     r.zelle      ?? undefined,
    authUserId: r.auth_user_id ?? undefined,
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
    seats: m.seats ?? undefined,
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
// All client-generated ids are namespaced with the active mesa code so
// reads can filter to a single group without a schema migration.

function makeId(): string {
  const uuid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  return makeMesaId(uuid)
}

// ─── Hook ──────────────────────────────────────────────────────

export function useStore() {
  const [state, setState] = useState<AppState>(INITIAL_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  // Cache raw event rows separately so we can rebuild Match.events on
  // partial updates (e.g. when a single event arrives over realtime).
  const eventsRef = useRef<EventRow[]>([])

  // ── Auth: track session + user, persists across reloads ──────
  useEffect(() => {
    let cancelled = false
    // Detect a magic-link redirect *before* supabase consumes the URL —
    // both the implicit (#access_token=…) and PKCE (?code=…) flows. The
    // SIGNED_IN event fires on every page load with a session, so we
    // arm a one-shot flag here to distinguish "fresh sign-in" from
    // "session restored on reload."
    const href = window.location.href
    const isMagicLinkReturn =
      href.includes('access_token=') ||
      href.includes('refresh_token=') ||
      /[?&]code=/.test(href)
    const isMagicLinkError =
      href.includes('error=') ||
      href.includes('error_code=') ||
      href.includes('error_description=')
    let pendingMagicLinkToast = isMagicLinkReturn

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setUser(data.session?.user ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN' && pendingMagicLinkToast && session?.user) {
        toast(
          'success',
          session.user.email ? `Sesión iniciada — ${session.user.email}` : 'Sesión iniciada',
        )
        pendingMagicLinkToast = false
      }
    })
    if (isMagicLinkError) toast('error', 'No pudimos confirmar el link. Probá pedirlo de nuevo.')
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

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

        // Filter to current mesa (id-prefix scoped).
        const myMatches = matchRows.filter((m) => idBelongsToMesa(m.id))
        const myMatchIds = new Set(myMatches.map((m) => m.id))
        const myEvents = eventRows.filter((e) => myMatchIds.has(e.match_id))
        const myPlayers = playerRows.filter((p) => idBelongsToMesa(p.id))
        const activeId = appRow?.active_match_id ?? null
        const scopedActive = activeId && idBelongsToMesa(activeId) ? activeId : null

        eventsRef.current = myEvents
        setState({
          schemaVersion: 2,
          roster: myPlayers.map(rowToPlayer),
          matches: myMatches.map((m) => rowToMatch(m, myEvents)),
          activeMatchId: scopedActive,
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
            const row = payload.new as PlayerRow
            if (!idBelongsToMesa(row.id)) return s
            const p = rowToPlayer(row)
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
            if (!idBelongsToMesa(row.id)) return s
            const m = rowToMatch(row, eventsRef.current)
            const exists = s.matches.some((x) => x.id === m.id)
            const next = exists
              ? s.matches.map((x) => (x.id === m.id ? m : x))
              : [m, ...s.matches]
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
          if (!idBelongsToMesa(row.match_id)) return
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
          if (!idBelongsToMesa(old.match_id)) return
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
        const next = row.active_match_id ?? null
        const scoped = next && idBelongsToMesa(next) ? next : null
        setState((s) => ({ ...s, activeMatchId: scoped }))
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
    setState((s) => ({ ...s, roster: [...s.roster, player] }))
    execOp(
      { kind: 'insert', table: 'players', payload: { id: player.id, name: trimmed } },
      'agregar jugador',
    )
    return player
  }, [])

  const renamePlayer = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
    }))
    execOp(
      { kind: 'update', table: 'players', patch: { name: trimmed }, eq: [['id', id]] },
      'renombrar jugador',
    )
  }, [])

  const retirePlayer = useCallback((id: string) => {
    const now = Date.now()
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => (p.id === id ? { ...p, retiredAt: now } : p)),
    }))
    execOp(
      {
        kind: 'update',
        table: 'players',
        patch: { retired_at: new Date(now).toISOString() },
        eq: [['id', id]],
      },
      'retirar jugador',
    )
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
    execOp(
      { kind: 'update', table: 'players', patch: { retired_at: null }, eq: [['id', id]] },
      'restaurar jugador',
    )
  }, [])

  const removePlayer = useCallback((id: string) => {
    setState((s) => {
      const used = s.matches.some(
        (m) => m.teamA.playerIds.includes(id) || m.teamB.playerIds.includes(id),
      )
      if (used) {
        const now = Date.now()
        execOp(
          {
            kind: 'update',
            table: 'players',
            patch: { retired_at: new Date(now).toISOString() },
            eq: [['id', id]],
          },
          'retirar jugador',
        )
        return { ...s, roster: s.roster.map((p) => (p.id === id ? { ...p, retiredAt: now } : p)) }
      }
      execOp(
        { kind: 'delete', table: 'players', eq: [['id', id]] },
        'eliminar jugador',
      )
      return { ...s, roster: s.roster.filter((p) => p.id !== id) }
    })
  }, [])

  // ── Auth actions ─────────────────────────────────────────────

  const signInWithEmail = useCallback(async (email: string): Promise<void> => {
    const trimmed = email.trim()
    if (!trimmed) throw new Error('Mail vacío')
    const { error: e } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    })
    if (e) throw e
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // ── Profile / claim ──────────────────────────────────────────

  const claimPlayer = useCallback(async (id: string): Promise<void> => {
    const u = (await supabase.auth.getUser()).data.user
    if (!u) throw new Error('Iniciá sesión primero')
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => (p.id === id ? { ...p, authUserId: u.id } : p)),
    }))
    const { error: e } = await supabase
      .from('players')
      .update({ auth_user_id: u.id })
      .eq('id', id)
    if (e) throw e
  }, [])

  const unclaimPlayer = useCallback(async (id: string): Promise<void> => {
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => {
        if (p.id !== id) return p
        const { authUserId, ...rest } = p
        void authUserId
        return rest
      }),
    }))
    const { error: e } = await supabase
      .from('players')
      .update({ auth_user_id: null })
      .eq('id', id)
    if (e) throw e
  }, [])

  const updatePlayer = useCallback(
    async (id: string, patch: PlayerProfilePatch): Promise<void> => {
      const rowPatch = profilePatchToRow(patch)
      // Optimistic local update
      setState((s) => ({
        ...s,
        roster: s.roster.map((p) => {
          if (p.id !== id) return p
          return {
            ...p,
            ...(patch.name      !== undefined ? { name: patch.name.trim() } : {}),
            ...(patch.firstName !== undefined ? { firstName: nullIfBlank(patch.firstName) ?? undefined } : {}),
            ...(patch.lastName  !== undefined ? { lastName:  nullIfBlank(patch.lastName)  ?? undefined } : {}),
            ...(patch.phone     !== undefined ? { phone:     nullIfBlank(patch.phone)     ?? undefined } : {}),
            ...(patch.venmo     !== undefined ? { venmo:     nullIfBlank(patch.venmo)     ?? undefined } : {}),
            ...(patch.zelle     !== undefined ? { zelle:     nullIfBlank(patch.zelle)     ?? undefined } : {}),
          }
        }),
      }))
      if (Object.keys(rowPatch).length === 0) return
      const { error: e } = await supabase.from('players').update(rowPatch).eq('id', id)
      if (e) throw e
    },
    [],
  )

  const setPlayerPhoto = useCallback(async (id: string, file: File | Blob): Promise<string> => {
    const { blob } = await optimizeAvatar(file)
    const path = `${id}.jpg`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
    if (upErr) throw upErr
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    // Cache-bust so the <img> reflects the new bytes immediately.
    const url = `${pub.publicUrl}?v=${Date.now()}`
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => (p.id === id ? { ...p, photoUrl: url } : p)),
    }))
    const { error: dbErr } = await supabase
      .from('players')
      .update({ photo_url: url })
      .eq('id', id)
    if (dbErr) throw dbErr
    return url
  }, [])

  const removePlayerPhoto = useCallback(async (id: string): Promise<void> => {
    setState((s) => ({
      ...s,
      roster: s.roster.map((p) => {
        if (p.id !== id) return p
        const { photoUrl, ...rest } = p
        void photoUrl
        return rest
      }),
    }))
    await supabase.storage.from('avatars').remove([`${id}.jpg`])
    const { error: e } = await supabase
      .from('players')
      .update({ photo_url: null })
      .eq('id', id)
    if (e) throw e
  }, [])

  // ── Match lifecycle ──────────────────────────────────────────

  const startMatch = useCallback(
    (
      teamA: { name: string; playerIds: string[] },
      teamB: { name: string; playerIds: string[] },
      seats?: string[],
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
        seats,
      }
      setState((s) => ({
        ...s,
        matches: [m, ...s.matches],
        activeMatchId: m.id,
      }))
      execOp(
        {
          kind: 'insert',
          table: 'matches',
          payload: {
            id: m.id,
            team_a_name: teamA.name,
            team_a_player_ids: teamA.playerIds,
            team_b_name: teamB.name,
            team_b_player_ids: teamB.playerIds,
            ...(seats ? { seats } : {}),
          },
        },
        'iniciar partida',
      )
      execOp(
        {
          kind: 'update',
          table: 'app_state',
          patch: { active_match_id: m.id },
          eq: [['id', 'singleton']],
        },
        'iniciar partida',
      )
      return m
    },
    [],
  )

  const score = useCallback((ev: Omit<ScoreEvent, 'at'>) => {
    setState((s) => {
      if (!s.activeMatchId) return s
      const matchId = s.activeMatchId
      const current = s.matches.find((x) => x.id === matchId)
      if (!current) return s
      const clamp = (n: number) => Math.max(0, Math.min(n, MAX_SCORE))
      const newA = ev.team === 'A' ? clamp(current.scoreA + ev.points) : current.scoreA
      const newB = ev.team === 'B' ? clamp(current.scoreB + ev.points) : current.scoreB
      // No-op if clamping zeroed the delta (e.g. swipe-down at 0)
      if (newA === current.scoreA && newB === current.scoreB) return s
      const finished = newA >= MAX_SCORE || newB >= MAX_SCORE
      const winner: 'A' | 'B' | null = finished
        ? newA >= MAX_SCORE ? 'A' : 'B'
        : null
      const at = Date.now()
      const m: Match = {
        ...current,
        scoreA: newA,
        scoreB: newB,
        winner,
        finishedAt: finished ? at : null,
        events: [...current.events, { ...ev, at }],
      }
      execOp(
        {
          kind: 'insert',
          table: 'events',
          payload: {
            match_id: matchId,
            team: ev.team,
            points: ev.points,
            reason: ev.reason,
            round_mode: ev.roundMode,
            at: new Date(at).toISOString(),
          },
        },
        'sumar punto',
      )
      execOp(
        {
          kind: 'update',
          table: 'matches',
          patch: {
            score_a: m.scoreA,
            score_b: m.scoreB,
            winner: m.winner,
            finished_at: m.finishedAt ? new Date(m.finishedAt).toISOString() : null,
          },
          eq: [['id', matchId]],
        },
        'sumar punto',
      )
      return { ...s, matches: s.matches.map((x) => (x.id === matchId ? m : x)) }
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
      // Delete the event row by (match_id, at) — `at` is ms-precise so this
      // is effectively unique. We pass `at` explicitly when inserting so
      // client + server agree on the value.
      execOp(
        {
          kind: 'delete',
          table: 'events',
          eq: [
            ['match_id', matchId],
            ['at', new Date(last.at).toISOString()],
          ],
        },
        'deshacer',
      )
      execOp(
        {
          kind: 'update',
          table: 'matches',
          patch: { score_a: newA, score_b: newB, winner: null, finished_at: null },
          eq: [['id', matchId]],
        },
        'deshacer',
      )
      return {
        ...s,
        matches: s.matches.map((x) => (x.id === matchId ? updatedMatch : x)),
      }
    })
  }, [])

  const finishMatch = useCallback(() => {
    setState((s) => ({ ...s, activeMatchId: null }))
    execOp(
      {
        kind: 'update',
        table: 'app_state',
        patch: { active_match_id: null },
        eq: [['id', 'singleton']],
      },
      'terminar partida',
    )
  }, [])

  const abandonMatch = useCallback(() => {
    setState((s) => {
      if (!s.activeMatchId) return s
      const matchId = s.activeMatchId
      execOp(
        {
          kind: 'update',
          table: 'matches',
          patch: { abandoned: true, finished_at: new Date().toISOString() },
          eq: [['id', matchId]],
        },
        'abandonar partida',
      )
      execOp(
        {
          kind: 'update',
          table: 'app_state',
          patch: { active_match_id: null },
          eq: [['id', 'singleton']],
        },
        'abandonar partida',
      )
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
    execOp(
      { kind: 'delete', table: 'matches', eq: [['id', id]] },
      'eliminar partida',
    )
  }, [])

  const clearAll = useCallback(async () => {
    // Wipe only this mesa's data — never cross-mesa.
    const prefix = `m:${getMesa()}:%`
    eventsRef.current = []
    setState(INITIAL_STATE)
    const { data } = await supabase
      .from('app_state')
      .select('active_match_id')
      .eq('id', 'singleton')
      .maybeSingle()
    const cur = (data as AppStateRow | null)?.active_match_id
    const ops: Array<PromiseLike<unknown>> = [
      supabase.from('events').delete().like('match_id', prefix),
      supabase.from('matches').delete().like('id', prefix),
      supabase.from('players').delete().like('id', prefix),
    ]
    if (cur && idBelongsToMesa(cur)) {
      ops.push(
        supabase.from('app_state').update({ active_match_id: null }).eq('id', 'singleton'),
      )
    }
    await Promise.allSettled(ops)
  }, [])

  const switchMesa = useCallback((code: string) => {
    persistMesa(code)
    // Reload to re-fetch state under the new mesa scope.
    window.location.reload()
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
    user,
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
    updatePlayer,
    setPlayerPhoto,
    removePlayerPhoto,
    claimPlayer,
    unclaimPlayer,
    signInWithEmail,
    signOut,
    startMatch,
    score,
    undo,
    finishMatch,
    abandonMatch,
    deleteMatch,
    clearAll,
    mesa: getMesa(),
    switchMesa,
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
    seats: m.seats ?? null,
  }
}

