import { motion } from 'framer-motion'
import type { Player } from '@/types/game'
import { MIN_TOGETHER, type Partner, type PartnerExtremes } from '@/utils/scoring'

/**
 * Who the selected player wins alongside, and who they don't.
 *
 * Driven by the standings selection below it, like the season chart —
 * the table is already the player picker, so this needs no control of
 * its own and no extra tab.
 *
 * Shows the record next to the rate on purpose. "80%" alone hides
 * whether that is 4-1 or 24-6, and in a league this size the
 * difference is most of what you'd want to know.
 */

export function PartnersCard({
  extremes, playerName, playerById,
}: {
  extremes: PartnerExtremes
  playerName: string
  playerById: (id: string) => Player | undefined
}) {
  const { best, worst, ranked, total } = extremes

  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">Compañeros</p>
        <p className="text-xs text-ink truncate">{playerName}</p>
      </div>

      {best && worst ? (
        <div className="mt-3 flex flex-col gap-1">
          <PartnerRow label="Mejor" tone="accent" partner={best} playerById={playerById} />
          <PartnerRow label="Peor" tone="soft" partner={worst} playerById={playerById} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-muted text-balance">
          {total === 0
            ? 'Todavía no jugó con nadie de este lado.'
            : ranked.length === 0
              ? `Hace falta jugar ${MIN_TOGETHER} partidas con la misma persona.`
              : 'Por ahora gana lo mismo con todos.'}
        </p>
      )}

      <p className="mt-3 text-eyebrow text-ink-soft">
        {ranked.length} de {total} compañeros · mínimo {MIN_TOGETHER} partidas juntos
      </p>
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
    <motion.div
      layout
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      /* 3.25rem, not 3: "MEJOR" at eyebrow tracking measures almost
         exactly 3rem, so the column had no slack and the gap was the
         only thing between the label and the name. */
      className="grid grid-cols-[3.25rem_1fr_2.5rem_2.5rem] items-center gap-2 rounded-sm bg-surface-hi px-3 py-2"
    >
      {/* Only "Mejor" takes the accent. Marking the other one in
          danger red would read as an error state, and this is a
          running joke between friends, not a fault. */}
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
    </motion.div>
  )
}
