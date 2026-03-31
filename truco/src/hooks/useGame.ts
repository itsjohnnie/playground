import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import {
  type GameState,
  type SavedMatch,
  type GameMode,
  type RoundMode,
  MAX_SCORE,
} from '../types/game'
import { addPoints, shouldBePicaPica } from '../utils/scoring'

const ACTIVE_KEY = 'truco_active_game'
const HISTORY_KEY = 'truco_history'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function detectRoundMode(s0: number, s1: number): RoundMode {
  if (shouldBePicaPica(s0, s1)) return 'picapica'
  return 'redondo'
}

export function useGame() {
  const [game, setGame] = useLocalStorage<GameState | null>(ACTIVE_KEY, null)
  const [history, setHistory] = useLocalStorage<SavedMatch[]>(HISTORY_KEY, [])

  const startGame = useCallback(
    (
      mode: GameMode,
      teamNames: [string, string],
      playerNames: string[]
    ) => {
      const teamA: import('../types/game').Team = {
        id: 'team-a',
        name: teamNames[0],
        playerIds: [],
      }
      const teamB: import('../types/game').Team = {
        id: 'team-b',
        name: teamNames[1],
        playerIds: [],
      }

      const playersPerTeam = mode === '4players' ? 2 : 3
      const players: import('../types/game').Player[] = playerNames.map((name, i) => {
        const teamId = i < playersPerTeam ? 'team-a' : 'team-b'
        const player: import('../types/game').Player = { id: makeId(), name, teamId }
        if (teamId === 'team-a') teamA.playerIds.push(player.id)
        else teamB.playerIds.push(player.id)
        return player
      })

      const newGame: GameState = {
        id: makeId(),
        mode,
        teams: [teamA, teamB],
        players,
        scores: [0, 0],
        history: [],
        currentRoundMode: 'redondo',
        isFinished: false,
        winnerId: null,
        startedAt: Date.now(),
        finishedAt: null,
      }
      setGame(newGame)
    },
    [setGame]
  )

  const addScore = useCallback(
    (teamIndex: 0 | 1, points: number, reason: string) => {
      setGame((prev) => {
        if (!prev || prev.isFinished) return prev

        const newScores: [number, number] = [...prev.scores] as [number, number]
        newScores[teamIndex] = addPoints(newScores[teamIndex], points)

        const isFinished = newScores[0] >= MAX_SCORE || newScores[1] >= MAX_SCORE
        const winnerId = isFinished
          ? newScores[0] >= MAX_SCORE
            ? prev.teams[0].id
            : prev.teams[1].id
          : null

        const newRoundMode = detectRoundMode(newScores[0], newScores[1])

        const entry: import('../types/game').ScoreEntry = {
          teamId: prev.teams[teamIndex].id,
          points,
          reason,
          roundMode: prev.currentRoundMode,
          timestamp: Date.now(),
        }

        return {
          ...prev,
          scores: newScores,
          history: [...prev.history, entry],
          currentRoundMode: newRoundMode,
          isFinished,
          winnerId,
          finishedAt: isFinished ? Date.now() : null,
        }
      })
    },
    [setGame]
  )

  const undoLast = useCallback(() => {
    setGame((prev) => {
      if (!prev || prev.history.length === 0) return prev
      const lastEntry = prev.history[prev.history.length - 1]
      const teamIndex = prev.teams[0].id === lastEntry.teamId ? 0 : 1
      const newScores: [number, number] = [...prev.scores] as [number, number]
      newScores[teamIndex] = Math.max(0, newScores[teamIndex] - lastEntry.points)
      const newRoundMode = detectRoundMode(newScores[0], newScores[1])
      return {
        ...prev,
        scores: newScores,
        history: prev.history.slice(0, -1),
        currentRoundMode: newRoundMode,
        isFinished: false,
        winnerId: null,
        finishedAt: null,
      }
    })
  }, [setGame])

  const finishGame = useCallback(() => {
    setGame((prev) => {
      if (!prev) return null
      // Save to history
      const winner =
        prev.winnerId === prev.teams[0].id ? prev.teams[0] : prev.teams[1]
      const match: SavedMatch = {
        id: prev.id,
        mode: prev.mode,
        teamNames: [prev.teams[0].name, prev.teams[1].name],
        finalScores: prev.scores,
        winnerName: winner?.name ?? '?',
        startedAt: prev.startedAt,
        finishedAt: Date.now(),
      }
      setHistory((h) => [match, ...h.slice(0, 19)])
      return null
    })
  }, [setGame, setHistory])

  const abandonGame = useCallback(() => {
    setGame(null)
  }, [setGame])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [setHistory])

  return {
    game,
    history,
    startGame,
    addScore,
    undoLast,
    finishGame,
    abandonGame,
    clearHistory,
  }
}
