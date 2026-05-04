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
  name: string
  joinedAt: number
  retiredAt?: number
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
