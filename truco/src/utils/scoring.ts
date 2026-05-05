import {
  MAX_SCORE,
  BUENAS_THRESHOLD,
  FALTA_ENVIDO_PICAPICA,
  PICAPICA_START,
  type RoundMode,
  type Match,
  type ScoreEvent,
  type Player,
} from '@/types/game'

export function isInBuenas(score: number): boolean {
  return score >= BUENAS_THRESHOLD
}

export function splitScore(score: number) {
  if (score <= BUENAS_THRESHOLD) return { malas: score, buenas: 0 }
  return { malas: BUENAS_THRESHOLD, buenas: score - BUENAS_THRESHOLD }
}

export function detectRoundMode(scoreA: number, scoreB: number): RoundMode {
  const max = Math.max(scoreA, scoreB)
  const min = Math.min(scoreA, scoreB)
  if (max >= PICAPICA_START && min < BUENAS_THRESHOLD && max < BUENAS_THRESHOLD) {
    return 'picapica'
  }
  return 'redondo'
}

export function calcFaltaEnvido(
  loserScore: number,
  winnerScore: number,
  roundMode: RoundMode,
): number {
  if (roundMode === 'picapica') return FALTA_ENVIDO_PICAPICA
  // Canon: falta envido is worth what the LEADING team needs to finish.
  // If both teams are still in malas, the target is buenas (15); as soon
  // as either team has crossed into buenas, the target is the match (30).
  const leader = Math.max(loserScore, winnerScore)
  const eitherInBuenas = isInBuenas(loserScore) || isInBuenas(winnerScore)
  const target = eitherInBuenas ? MAX_SCORE : BUENAS_THRESHOLD
  return Math.max(target - leader, 1)
}

export function addPoints(current: number, points: number): number {
  return Math.min(current + points, MAX_SCORE)
}

// ─── Stats ────────────────────────────────────────────────────

export interface PlayerStats {
  playerId: string
  matches: number
  wins: number
  losses: number
  winRate: number
  pointsFor: number
  pointsAgainst: number
  longestStreak: number
  currentStreak: { kind: 'W' | 'L'; count: number } | null
  recentForm: ('W' | 'L')[]
}

export function computePlayerStats(playerId: string, matches: Match[]): PlayerStats {
  const finished = matches.filter((m) => m.winner !== null && !m.abandoned)
  // Order from oldest to newest for streak math
  const ordered = [...finished].sort((a, b) => a.startedAt - b.startedAt)

  let wins = 0
  let losses = 0
  let pointsFor = 0
  let pointsAgainst = 0
  let longestStreak = 0
  let currentStreakKind: 'W' | 'L' | null = null
  let currentStreakCount = 0
  const form: ('W' | 'L')[] = []

  for (const m of ordered) {
    const onA = m.teamA.playerIds.includes(playerId)
    const onB = m.teamB.playerIds.includes(playerId)
    if (!onA && !onB) continue

    const won = (onA && m.winner === 'A') || (onB && m.winner === 'B')
    const my = onA ? m.scoreA : m.scoreB
    const their = onA ? m.scoreB : m.scoreA
    pointsFor += my
    pointsAgainst += their

    if (won) wins++
    else losses++
    form.push(won ? 'W' : 'L')

    const kind: 'W' | 'L' = won ? 'W' : 'L'
    if (currentStreakKind === kind) currentStreakCount++
    else { currentStreakKind = kind; currentStreakCount = 1 }
    if (currentStreakCount > longestStreak) longestStreak = currentStreakCount
  }

  const totalMatches = wins + losses
  return {
    playerId,
    matches: totalMatches,
    wins,
    losses,
    winRate: totalMatches > 0 ? wins / totalMatches : 0,
    pointsFor,
    pointsAgainst,
    longestStreak,
    currentStreak:
      currentStreakKind && currentStreakCount > 0
        ? { kind: currentStreakKind, count: currentStreakCount }
        : null,
    recentForm: form.slice(-5),
  }
}

export function leaderboard(roster: Player[], matches: Match[]): PlayerStats[] {
  return roster
    .map((p) => computePlayerStats(p.id, matches))
    .filter((s) => s.matches > 0)
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      if (b.matches !== a.matches) return b.matches - a.matches
      return 0
    })
}

// ─── Reducers ─────────────────────────────────────────────────

export function applyEvent(match: Match, ev: ScoreEvent): Match {
  const newScores =
    ev.team === 'A'
      ? { a: addPoints(match.scoreA, ev.points), b: match.scoreB }
      : { a: match.scoreA, b: addPoints(match.scoreB, ev.points) }

  const finished = newScores.a >= MAX_SCORE || newScores.b >= MAX_SCORE
  const winner: 'A' | 'B' | null = finished
    ? newScores.a >= MAX_SCORE
      ? 'A'
      : 'B'
    : null

  return {
    ...match,
    scoreA: newScores.a,
    scoreB: newScores.b,
    events: [...match.events, ev],
    winner,
    finishedAt: finished ? Date.now() : null,
  }
}

export function undoLastEvent(match: Match): Match {
  if (match.events.length === 0) return match
  const last = match.events[match.events.length - 1]
  const newScores =
    last.team === 'A'
      ? { a: Math.max(0, match.scoreA - last.points), b: match.scoreB }
      : { a: match.scoreA, b: Math.max(0, match.scoreB - last.points) }
  return {
    ...match,
    scoreA: newScores.a,
    scoreB: newScores.b,
    events: match.events.slice(0, -1),
    winner: null,
    finishedAt: null,
  }
}
