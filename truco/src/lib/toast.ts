export type ToastKind = 'error' | 'success' | 'info'
export type ToastMsg = { id: number; kind: ToastKind; text: string; ttl: number }

type Listener = (msg: ToastMsg) => void
const listeners = new Set<Listener>()
let nextId = 1

export function toast(kind: ToastKind, text: string, ttl = 3500) {
  const m: ToastMsg = { id: nextId++, kind, text, ttl }
  listeners.forEach((l) => l(m))
  return m.id
}

export function subscribeToast(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
