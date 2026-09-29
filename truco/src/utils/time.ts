/**
 * Wall clock for anything showing a moment in a match — the play-by-play
 * rows and the match header above them.
 *
 * 24-hour rather than the locale's default: es-AR renders 12-hour as
 * "10:46 p. m.", about three times the width of "22:46" in a column
 * that has to sit beside three others on a phone. `h23` rather than
 * `hour12: false`, which resolves to h24 in some locales and would
 * print midnight as "24:00".
 *
 * Shared so the header can't drift back to the locale default and print
 * "11:40 p. m." two lines above a list of "23:40"s.
 */

const TIME_FMT = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatClock(ms: number): string {
  return TIME_FMT.format(new Date(ms))
}
