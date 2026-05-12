// ─────────────────────────────────────────────────────────────
// Truco data model — v2
// Spec: truco/DESIGN.md §5.1
// ─────────────────────────────────────────────────────────────

export type RoundMode = 'redondo' | 'picapica'

export type ScoreReason =
  | 'truco' | 'truco_rechazado'
  | 'retruco' | 'retruco_rechazado'
  | 'vale4' | 'vale4_rechazado'
  | 'envido' | 'envido_rechazado'
  | 'real_envido' | 'real_envido_rechazado'
  | 'falta_envido' | 'falta_envido_rechazado'
  | 'manual'

export const SCORE_REASON_LABEL: Record<ScoreReason, string> = {
  truco: 'Truco',
  truco_rechazado: 'Truco (no quiso)',
  retruco: 'Retruco',
  retruco_rechazado: 'Retruco (no quiso)',
  vale4: 'Vale Cuatro',
  vale4_rechazado: 'Vale Cuatro (no quiso)',
  envido: 'Envido',
  envido_rechazado: 'Envido (no quiso)',
  real_envido: 'Real Envido',
  real_envido_rechazado: 'Real Envido (no quiso)',
  falta_envido: 'Falta Envido',
  falta_envido_rechazado: 'Falta Envido (no quiso)',
  manual: 'Manual',
}

export interface Player {
  id: string
  name: string                // displayed nickname
  joinedAt: number
  retiredAt?: number
  // ── Profile fields (all optional) ──
  firstName?: string
  lastName?: string
  phone?: string
  photoUrl?: string
  venmo?: string
  zelle?: string
  // Supabase auth user that has claimed this player. Null = unclaimed.
  authUserId?: string
}

export interface Team {
  name: string
  playerIds: string[]
}

export interface ScoreEvent {
  team: 'A' | 'B'
  points: number
  reason: ScoreReason
  roundMode: RoundMode
  at: number
}

export interface Match {
  id: string
  startedAt: number
  finishedAt: number | null
  teamA: Team
  teamB: Team
  scoreA: number
  scoreB: number
  events: ScoreEvent[]
  winner: 'A' | 'B' | null
  abandoned?: true
  // Seating arrangement for 3v3 "pica pica" matches. Length 6: the
  // seats are in clockwise order around the round table, alternating
  // Team A / Team B starting at seat 0. So:
  //   even indices (0, 2, 4) belong to Team A
  //   odd indices  (1, 3, 5) belong to Team B
  // The pica pica rival is always the player directly across the
  // table, three seats away. Alternation guarantees the rival is on
  // the opposite team. Undefined on 1v1 / 2v2 / pre-feature matches.
  seats?: string[]
}

// Derive the pica pica head-to-head pairings from a `seats` array.
// Each seat's rival is the one 3 seats away (directly across the
// round table). Returns [teamA_id, teamB_id] tuples — one duel per
// pair — with Team A always first.
export function picaPicaPairs(seats: string[] | undefined): Array<[string, string]> | null {
  if (!seats || seats.length !== 6) return null
  return [
    [seats[0], seats[3]],  // top  ↔ bottom
    [seats[2], seats[5]],  // lower-right ↔ upper-left
    [seats[4], seats[1]],  // lower-left  ↔ upper-right
  ]
}

export interface AppState {
  schemaVersion: 2
  roster: Player[]
  matches: Match[]      // newest first
  activeMatchId: string | null
}

// ─── Constants ────────────────────────────────────────────────
export const MAX_SCORE = 30
export const BUENAS_THRESHOLD = 15
export const PICAPICA_START = 5
export const FALTA_ENVIDO_PICAPICA = 6

export const TRUCO_POINTS = {
  truco:   { refused: 1, won: 2 },
  retruco: { refused: 2, won: 3 },
  vale4:   { refused: 3, won: 4 },
} as const

export const ENVIDO_POINTS = {
  envido:     { refused: 1, won: 2 },
  realenvido: { refused: 2, won: 3 },
} as const

// ─── Initial state & migration ────────────────────────────────
export const INITIAL_STATE: AppState = {
  schemaVersion: 2,
  roster: [],
  matches: [],
  activeMatchId: null,
}
