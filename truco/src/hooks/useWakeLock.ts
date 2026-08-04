import { useEffect } from 'react'

/**
 * Keeps the screen awake while `enabled` is true, via the Screen Wake
 * Lock API. The phone sits face-up on the table between manos, so the
 * scoreboard dimming out mid-partida is a real annoyance.
 *
 * Two things the API forces on us:
 *  - The lock is dropped whenever the page is hidden (tab switch, phone
 *    locked, app backgrounded), and it is *not* restored automatically.
 *    So we re-acquire on `visibilitychange`.
 *  - `request()` rejects rather than throws — on unsupported browsers,
 *    on low battery, or when the document isn't visible at call time.
 *    All of those are fine to ignore: the screen just behaves normally.
 *
 * Supported on Chrome/Edge/Android and Safari 16.4+ (iOS included, both
 * in-tab and installed as a PWA). Older iOS silently falls through.
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

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => {})
      sentinel = null
    }
  }, [enabled])
}
