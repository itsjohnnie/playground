import type { Match, ScoreEvent } from '@/types/game'
import { SCORE_REASON_LABEL } from '@/types/game'
import { formatClock } from '@/utils/time'

/**
 * One line of a match's play-by-play. Shared because the same row is
 * rendered in two places — the sheet inside a live match and the detail
 * in Historial — which had drifted apart on column widths and the team
 * name's size despite showing the same thing.
 *
 * The timestamp is hour and minute only. A hand takes seconds to score,
 * so it's there to tell you when the run happened and how the night was
 * paced, not to time individual hands — and the date already sits in
 * the match header above.
 */

export function JugadaRow({ event, match }: { event: ScoreEvent; match: Match }) {
  const team = event.team === 'A' ? match.teamA.name : match.teamB.name
  return (
    <div className="grid grid-cols-[5.5rem_1fr_2.75rem_2.25rem] items-center gap-2 rounded-sm bg-surface-hi px-3 py-2">
      <span className="font-display text-ink text-sm truncate">{team}</span>
      <span className="text-xs text-ink-muted truncate">
        {SCORE_REASON_LABEL[event.reason]}
      </span>
      <time
        dateTime={new Date(event.at).toISOString()}
        className="tabular text-eyebrow text-ink-soft text-right"
      >
        {formatClock(event.at)}
      </time>
      <span className="tabular text-accent text-sm font-semibold text-right">
        {event.points >= 0 ? '+' : ''}{event.points}
      </span>
    </div>
  )
}
