import {
  MAX_SCORE,
  BUENAS_THRESHOLD,
  FALTA_ENVIDO_PICAPICA,
  type RoundMode,
} from '../types/game'

/** Returns true if score is in "buenas" zone (15-29) */
export function isInBuenas(score: number): boolean {
  return score >= BUENAS_THRESHOLD
}

/** Returns the "malas" portion (0-14) and "buenas" portion (0-14) */
export function splitScore(score: number): { malas: number; buenas: number } {
  if (score <= BUENAS_THRESHOLD) {
    return { malas: score, buenas: 0 }
  }
  return { malas: BUENAS_THRESHOLD, buenas: score - BUENAS_THRESHOLD }
}

/** How many points are needed for Falta Envido */
export function calcFaltaEnvido(
  loserScore: number,
  winnerScore: number,
  roundMode: RoundMode
): number {
  if (roundMode === 'picapica') return FALTA_ENVIDO_PICAPICA

  if (!isInBuenas(loserScore)) {
    // Loser is in malas: winner gets points to reach buenas (15)
    return Math.max(BUENAS_THRESHOLD - winnerScore, 1)
  } else {
    // Loser is in buenas: winner gets points to reach 30
    return Math.max(MAX_SCORE - winnerScore, 1)
  }
}

/** Points awarded when Truco bets are refused or won */
export const TRUCO_POINTS = {
  truco: { refused: 1, won: 2 },
  retruco: { refused: 2, won: 3 },
  vale4: { refused: 3, won: 4 },
} as const

/** Points awarded when Envido bets are refused or won */
export const ENVIDO_POINTS = {
  envido: { refused: 1, won: 2 },
  realenvido: { refused: 2, won: 3 },
  faltaenvido: { refused: 'falta', won: 'falta' },
} as const

/** Whether pica-pica mode should be active */
export function shouldBePicaPica(score0: number, score1: number): boolean {
  const maxScore = Math.max(score0, score1)
  const minScore = Math.min(score0, score1)
  // Active once any team reaches 5 pts, deactivated once any team hits 15 (buenas)
  return maxScore >= 5 && minScore < BUENAS_THRESHOLD && maxScore < BUENAS_THRESHOLD
}

/** Clamp new score to max */
export function addPoints(current: number, points: number): number {
  return Math.min(current + points, MAX_SCORE)
}

/** Format score for display: "X malas" or "X buenas" */
export function formatScore(score: number): string {
  if (score === 0) return '0'
  if (score < BUENAS_THRESHOLD) return `${score} malas`
  if (score === BUENAS_THRESHOLD) return '¡Buenas!'
  return `${score - BUENAS_THRESHOLD} buenas`
}

/** Number of full groups of 5 and remainder for palito rendering */
export function palitosLayout(count: number): { groups: number[]; remainder: number } {
  const full = Math.floor(count / 5)
  const remainder = count % 5
  return {
    groups: Array(full).fill(5),
    remainder,
  }
}
