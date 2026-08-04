import { useEffect } from 'react'

/**
 * Keeps the screen awake while `enabled` is true, via the Screen Wake
 * Lock API. The phone sits face-up on the table between manos, so the
 * scoreboard dimming out mid-partida is a real annoyance.
 *
 * Three things the API forces on us:
 *  - The lock is dropped whenever the page is hidden (tab switch, phone
 *    locked, app backgrounded), and it is *not* restored automatically.
 *    So we re-acquire on `visibilitychange`.
 *  - `request()` rejects rather than throws — on unsupported browsers,
 *    on low battery (iOS Low Power Mode refuses outright), or when the
 *    document isn't visible at call time. All of those are fine to
 *    ignore: the screen just behaves normally.
 *  - A rejection is final; nothing retries for us. That bites hardest on
 *    a cold launch of the installed PWA, where we restore straight into
 *    `game` and ask for the lock before iOS has settled. So we also
 *    retry on the next tap — on the game screen every tap is a score
 *    tap, so the recovery is invisible.
 *
 * Supported on Chrome/Edge/Android and Safari 16.4+ (iOS included, both
 * in-tab and added to the home screen). Older iOS silently falls through.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (!('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      if (cancelled || document.visibilityState !== 'visible') return
      if (sentinel && !sentinel.released) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        // The effect may have torn down while we were awaiting.
        if (cancelled) { void lock.release(); return }
        sentinel = lock
      } catch { /* unsupported, low battery, not visible — no-op */ }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void acquire()
    }

    // Cheap when we already hold the lock — `acquire` bails immediately.
    function onPointerDown() {
      void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    document.addEventListener('pointerdown', onPointerDown, { passive: true })

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('pointerdown', onPointerDown)
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => {})
      sentinel = null
    }
  }, [enabled])
}
