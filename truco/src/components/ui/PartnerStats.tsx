import type { Match, Player } from '@/types/game'
import {
  MIN_TOGETHER,
  computePlayerStats,
  partnerExtremes,
  type Partner,
} from '@/utils/scoring'

/**
 * One player's record, and who they win alongside.
 *
 * Lives on the profile rather than in Estadísticas because this is a
 * fact about a person, and the profile is the only place in the app
 * that is about one. In the standings the subject was whichever row
 * you had last tapped — implicit, and easy to misread as being about
 * the table rather than about you. It also can't hang off the signed-in
 * account: most of the roster is unclaimed, so any player's profile has
 * to show their own numbers whether or not anyone has signed in.
 *
 * Borderless on purpose: the profile's other blocks are eyebrow-labelled
 * sections, not cards, and a bordered panel here would read as a
 * different kind of thing.
 */

export function PartnerStats({
  player, matches, playerById,
}: {
  player: Player
  matches: Match[]
  playerById: (id: string) => Player | undefined
}) {
  const me = computePlayerStats(player.id, matches)
  const { best, worst, ranked, total } = partnerExtremes(player.id, matches)

  // Nothing to say before they've finished a match.
  if (me.matches === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">Récord</span>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Jugadas" value={me.matches} />
        <Stat label="Ganadas" value={me.wins} />
        {/* Not "%" — the value already carries the sign, and the
            standings' terse column headers earn their brevity from
            being in a table. There is room for a word here. */}
        <Stat label="Efectividad" value={`${Math.round(me.winRate * 100)}%`} accent />
      </div>

      {/* The overall rate sits right above for a reason: "100% con
          Bruno" means something different for a player who wins 80%
          of everything than for one who wins 40%. */}
      {total > 0 && (
        <>
          <span className="eyebrow mt-2">Compañeros</span>
          {best && worst ? (
            <div className="flex flex-col gap-1">
              <PartnerRow label="Mejor" tone="accent" partner={best} playerById={playerById} />
              <PartnerRow label="Peor" tone="soft" partner={worst} playerById={playerById} />
            </div>
          ) : (
            <p className="text-sm text-ink-muted text-balance">
              {ranked.length === 0
                ? `Hace falta jugar ${MIN_TOGETHER} partidas con la misma persona.`
                : 'Por ahora gana lo mismo con todos.'}
            </p>
          )}
          {/* No standing footnote about the threshold. When everyone
              qualifies it says nothing, and the one moment the rule
              matters — when nothing clears it — the empty state above
              already explains it. */}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-sm bg-surface-hi px-3 py-2">
      <div className={`tabular text-h2 ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
      <div className="text-eyebrow text-ink-soft">{label}</div>
    </div>
  )
}

function PartnerRow({
  label, tone, partner, playerById,
}: {
  label: string
  tone: 'accent' | 'soft'
  partner: Partner
  playerById: (id: string) => Player | undefined
}) {
  return (
    <div className="grid grid-cols-[3.25rem_1fr_2.5rem_2.5rem] items-center gap-2 rounded-sm bg-surface-hi px-3 py-2">
      {/* Only "Mejor" takes the accent. Marking the other one in danger
          red would read as an error state, and this is a running joke
          between friends, not a fault. */}
      <span className={`eyebrow ${tone === 'accent' ? 'text-accent' : 'text-ink-soft'}`}>
        {label}
      </span>
      <span className="text-ink text-sm truncate">
        {playerById(partner.playerId)?.name ?? '?'}
      </span>
      <span className="tabular text-xs text-ink-muted text-right">
        {partner.wins}–{partner.losses}
      </span>
      <span
        className={`tabular text-sm font-semibold text-right ${
          tone === 'accent' ? 'text-accent' : 'text-ink-muted'
        }`}
      >
        {Math.round(partner.winRate * 100)}%
      </span>
    </div>
  )
}
