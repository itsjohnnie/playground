import { useEffect } from 'react'

interface Options {
  enabled?: boolean
  edgePx?: number
  minDistance?: number
  maxOffAxis?: number
  minVelocity?: number
}

/**
 * iOS-style edge-swipe-back. Fires `onBack` when a touch starts within
 * `edgePx` of the left edge and ends with significant rightward motion.
 * Document-level listener; pass `enabled: false` to opt out (e.g. on
 * the root screen where there is no back).
 */
export function useEdgeSwipeBack(onBack: () => void, options: Options = {}) {
  const {
    enabled    = true,
    edgePx     = 20,
    minDistance = 70,
    maxOffAxis = 80,
    minVelocity = 0.5,
  } = options

  useEffect(() => {
    if (!enabled) return
    let startX = 0
    let startY = 0
    let startT = 0
    let tracking = false

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      if (!t || t.clientX > edgePx) return
      startX = t.clientX
      startY = t.clientY
      startT = performance.now()
      tracking = true
    }
    function onTouchEnd(e: TouchEvent) {
      if (!tracking) return
      tracking = false
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - startX
      const dy = Math.abs(t.clientY - startY)
      const dt = Math.max(1, performance.now() - startT)
      const vx = dx / dt // px/ms
      if (dy > maxOffAxis) return
      if (dx >= minDistance || vx >= minVelocity) onBack()
    }
    function onTouchCancel() {
      tracking = false
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend',   onTouchEnd,   { passive: true })
    document.addEventListener('touchcancel', onTouchCancel, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend',   onTouchEnd)
      document.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [onBack, enabled, edgePx, minDistance, maxOffAxis, minVelocity])
}
