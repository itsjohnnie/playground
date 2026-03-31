export type GameMode = '4players' | '6players'
export type RoundMode = 'redondo' | 'picapica'

export interface Player {
  id: string
  name: string
  teamId: string
}

export interface Team {
  id: string
  name: string
  playerIds: string[]
}

export interface ScoreEntry {
  teamId: string
  points: number
  reason: string
  roundMode: RoundMode
  timestamp: number
}

export interface GameState {
  id: string
  mode: GameMode
  teams: [Team, Team]
  players: Player[]
  scores: [number, number] // [team0, team1]
  history: ScoreEntry[]
  currentRoundMode: RoundMode
  isFinished: boolean
  winnerId: string | null
  startedAt: number
  finishedAt: number | null
}

export interface SavedMatch {
  id: string
  mode: GameMode
  teamNames: [string, string]
  finalScores: [number, number]
  winnerName: string
  startedAt: number
  finishedAt: number
}

// Scoring reasons for display
export const SCORE_REASONS = {
  TRUCO_RECHAZADO: 'Truco (rechazado)',
  TRUCO_GANADO: 'Truco',
  RETRUCO_RECHAZADO: 'Retruco (rechazado)',
  RETRUCO_GANADO: 'Retruco',
  VALE4_RECHAZADO: 'Vale cuatro (rechazado)',
  VALE4_GANADO: 'Vale cuatro',
  ENVIDO_RECHAZADO: 'Envido (rechazado)',
  ENVIDO_GANADO: 'Envido',
  REAL_ENVIDO_RECHAZADO: 'Real Envido (rechazado)',
  REAL_ENVIDO_GANADO: 'Real Envido',
  FALTA_ENVIDO_RECHAZADO: 'Falta Envido (rechazado)',
  FALTA_ENVIDO_GANADO: 'Falta Envido',
  MANUAL: 'Punto manual',
} as const

export type ScoreReason = typeof SCORE_REASONS[keyof typeof SCORE_REASONS]

export const MAX_SCORE = 30
export const BUENAS_THRESHOLD = 15
export const PICAPICA_START = 5
export const PICAPICA_END = 15 // when either team enters buenas
export const FALTA_ENVIDO_PICAPICA = 6
