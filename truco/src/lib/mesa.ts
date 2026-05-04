// Lightweight per-device "mesa" (table) selector. Each piece of data we
// write is namespaced into an id of the form `m:${code}:${uuid}` so we can
// filter reads by id prefix without a schema migration. Legacy rows (no
// prefix) belong to the `default` mesa.

const KEY = 'truco.mesa.v1'
const DEFAULT = 'default'

const VALID = /^[a-z0-9-]{2,16}$/i

export function normalizeMesaCode(input: string): string | null {
  const t = input.trim().toLowerCase()
  if (!VALID.test(t)) return null
  return t
}

export function getMesa(): string {
  try {
    const v = localStorage.getItem(KEY)
    if (v && VALID.test(v)) return v.toLowerCase()
  } catch { /* no localStorage */ }
  return DEFAULT
}

export function setMesa(code: string) {
  const norm = normalizeMesaCode(code)
  if (!norm) throw new Error('Código inválido')
  localStorage.setItem(KEY, norm)
}

export function isDefaultMesa(): boolean {
  return getMesa() === DEFAULT
}

const PREFIX_RE = /^m:([a-z0-9-]+):/i

export function mesaIdPrefix(code: string = getMesa()): string {
  return `m:${code}:`
}

export function makeMesaId(uuid: string, code: string = getMesa()): string {
  return `${mesaIdPrefix(code)}${uuid}`
}

// Returns true if the given row id belongs to the current mesa. Legacy
// (un-prefixed) ids are treated as belonging to `default`.
export function idBelongsToMesa(id: string, code: string = getMesa()): boolean {
  const m = id.match(PREFIX_RE)
  if (!m) return code === DEFAULT
  return m[1].toLowerCase() === code.toLowerCase()
}

export const MESA_DEFAULT = DEFAULT
