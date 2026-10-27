import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'

// Serializable shape of a Supabase mutation we may need to replay later.
export type QueuedOp =
  | { kind: 'insert'; table: string; payload: Record<string, unknown> }
  | { kind: 'update'; table: string; patch: Record<string, unknown>; eq: Array<[string, string | number]> }
  | { kind: 'delete'; table: string; eq: Array<[string, string | number]> }

const STORAGE_KEY = 'truco.writeQueue.v1'

const queue: QueuedOp[] = readQueue()
let draining = false
let drainTimer: number | null = null

function readQueue(): QueuedOp[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return raw ? (JSON.parse(raw) as QueuedOp[]) : []
  } catch {
    return []
  }
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)) } catch { /* swallow */ }
}

function isNetworkErr(e: unknown): boolean {
  if (!navigator.onLine) return true
  if (!e) return false
  // PostgREST returns an `error.code`; native fetch failures do not.
  const obj = e as { code?: string; message?: string; name?: string }
  if (obj.code) return false
  const msg = (obj.message || '').toLowerCase()
  return (
    obj.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed')
  )
}

async function applyOp(op: QueuedOp): Promise<{ error: unknown }> {
  const q = supabase.from(op.table)
  if (op.kind === 'insert') {
    const { error } = await q.insert(op.payload)
    return { error }
  }
  if (op.kind === 'update') {
    let chain = q.update(op.patch)
    for (const [col, val] of op.eq) chain = chain.eq(col, val)
    const { error } = await chain
    return { error }
  }
  // delete
  let chain = q.delete()
  for (const [col, val] of op.eq) chain = chain.eq(col, val)
  const { error } = await chain
  return { error }
}

function enqueue(op: QueuedOp) {
  queue.push(op)
  persist()
  scheduleDrain()
}

function scheduleDrain(delay = 4000) {
  if (drainTimer != null) return
  drainTimer = window.setTimeout(() => {
    drainTimer = null
    drain()
  }, delay)
}

export async function drain(): Promise<void> {
  if (draining) return
  if (!navigator.onLine) return
  if (queue.length === 0) return
  draining = true
  let progressed = false
  try {
    while (queue.length > 0) {
      const head = queue[0]
      try {
        const { error } = await applyOp(head)
        if (error) {
          if (isNetworkErr(error)) break          // network: stop, retry later
          // Permanent error (RLS, constraint) — drop + log.
          console.error('writeQueue/drop', error, head)
          queue.shift()
          persist()
          continue
        }
        queue.shift()
        persist()
        progressed = true
      } catch (e) {
        if (isNetworkErr(e)) break
        console.error('writeQueue/drop-throw', e, head)
        queue.shift()
        persist()
      }
    }
  } finally {
    draining = false
    if (queue.length === 0 && progressed) toast('success', 'Sincronizado')
    else if (queue.length > 0) scheduleDrain(15000)
  }
}

// ─── Unacked-write tracking ────────────────────────────────────
//
// Supabase echoes our own writes back over realtime, and they arrive
// one per write, in order, well after the local state has moved on.
// Tap four points quickly and the echo of the first write still says
// "score is 1" — applying it would drag the display backwards. So
// callers can tag a write with a scope (a row id) and ask whether
// that row still has writes this device hasn't seen come back yet.
//
// The grace period matters as much as the counter: the HTTP response
// for a write lands *before* its realtime echo, so a scope that went
// quiet the instant the last write acked would still be unguarded
// when the stale echoes turn up. Holding it briefly covers that gap.
const ECHO_GRACE_MS = 1500

const inFlight = new Map<string, number>()
const settledAt = new Map<string, number>()

/** True while this device's copy of `scope` is likely ahead of the server's. */
export function hasUnackedWrites(scope: string): boolean {
  if ((inFlight.get(scope) ?? 0) > 0) return true
  const t = settledAt.get(scope)
  return t != null && Date.now() - t < ECHO_GRACE_MS
}

function release(scope: string) {
  const n = (inFlight.get(scope) ?? 1) - 1
  if (n > 0) inFlight.set(scope, n)
  else inFlight.delete(scope)
  settledAt.set(scope, Date.now())
}

export async function execOp(op: QueuedOp, label: string, scope?: string): Promise<void> {
  if (scope) inFlight.set(scope, (inFlight.get(scope) ?? 0) + 1)
  // Serialize all writes through a single promise chain so dependent ops
  // (e.g. events.insert that references a freshly-created match) can never
  // hit Supabase before their parent has committed.
  const next = writeChain.then(() => doExec(op, label))
  // Decouple chain progression from caller-visible result — a thrown error
  // inside doExec must not poison every subsequent op.
  writeChain = next.catch(() => undefined)
  if (scope) void next.catch(() => undefined).then(() => release(scope))
  return next
}

let writeChain: Promise<unknown> = Promise.resolve()

function describeError(e: unknown): string {
  if (!e) return 'unknown'
  const obj = e as { code?: string; message?: string; details?: string; hint?: string }
  // PostgREST errors have code + message + details. Pick the most useful part
  // and keep it short enough to read in a toast.
  const code = obj.code ? `[${obj.code}]` : ''
  const msg = (obj.message || obj.details || obj.hint || '').slice(0, 90)
  return [code, msg].filter(Boolean).join(' ').trim() || 'unknown'
}

async function doExec(op: QueuedOp, label: string): Promise<void> {
  try {
    const { error } = await applyOp(op)
    if (error) {
      if (isNetworkErr(error)) {
        enqueue(op)
        toast('info', `Sin conexión — ${label} se sincroniza más tarde`)
        return
      }
      console.error(label, error, op)
      toast('error', `No se pudo guardar ${label}: ${describeError(error)}`, 8000)
    }
  } catch (e) {
    if (isNetworkErr(e)) {
      enqueue(op)
      toast('info', `Sin conexión — ${label} se sincroniza más tarde`)
      return
    }
    console.error(label, e, op)
    toast('error', `No se pudo guardar ${label}: ${describeError(e)}`, 8000)
  }
}

export function pendingCount(): number {
  return queue.length
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { drain() })
  // Best-effort drain on load
  if (navigator.onLine) scheduleDrain(1500)
}
