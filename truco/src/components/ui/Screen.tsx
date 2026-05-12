import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const EASE = [0.23, 1, 0.32, 1] as const

const transition = {
  duration: 0.32,
  ease: EASE,
  // Children-controlled stagger: any direct motion child of Screen that
  // declares the matching `staggerItem` variants below gets a subtle
  // cascade for free.
  staggerChildren: 0.045,
  delayChildren: 0.04,
}
const variants = {
  initial: { opacity: 0, y: 10, scale: 0.992 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: -8, scale: 0.996, transition: { duration: 0.18, ease: EASE } },
}

// Re-exported so list children can opt into the cascade by spreading
// these variants without redefining the keyframes themselves.
// eslint-disable-next-line react-refresh/only-export-components
export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.16, ease: EASE } },
}

// How much scroll headroom (in px) we need above/below before we
// fade in the corresponding edge. Small dead zone so a 1px wobble
// doesn't flicker the overlays.
const FADE_THRESHOLD = 4
// Height of the fade gradient + blur strip at each edge. Tall
// enough that the falloff feels gradual instead of reading as a
// hard band — both the bg colour and the blur ease out across the
// strip rather than cutting off.
const FADE_HEIGHT = 120

// Multi-stop curves that approximate an ease-in-out sigmoid. Used
// for both the bg-colour gradient and the backdrop-blur mask, so
// the colour wash and the blur taper together at the same rate.
const FADE_BG_TOP =
  'linear-gradient(to bottom, ' +
  'hsl(var(--bg)) 0%, ' +
  'hsl(var(--bg) / 0.94) 18%, ' +
  'hsl(var(--bg) / 0.78) 36%, ' +
  'hsl(var(--bg) / 0.52) 55%, ' +
  'hsl(var(--bg) / 0.24) 76%, ' +
  'hsl(var(--bg) / 0.08) 90%, ' +
  'transparent 100%)'
const FADE_BG_BOTTOM =
  'linear-gradient(to top, ' +
  'hsl(var(--bg)) 0%, ' +
  'hsl(var(--bg) / 0.94) 18%, ' +
  'hsl(var(--bg) / 0.78) 36%, ' +
  'hsl(var(--bg) / 0.52) 55%, ' +
  'hsl(var(--bg) / 0.24) 76%, ' +
  'hsl(var(--bg) / 0.08) 90%, ' +
  'transparent 100%)'
const FADE_MASK_TOP =
  'linear-gradient(to bottom, ' +
  '#000 0%, ' +
  'rgba(0,0,0,0.92) 25%, ' +
  'rgba(0,0,0,0.66) 50%, ' +
  'rgba(0,0,0,0.32) 75%, ' +
  'rgba(0,0,0,0.1) 90%, ' +
  'transparent 100%)'
const FADE_MASK_BOTTOM =
  'linear-gradient(to top, ' +
  '#000 0%, ' +
  'rgba(0,0,0,0.92) 25%, ' +
  'rgba(0,0,0,0.66) 50%, ' +
  'rgba(0,0,0,0.32) 75%, ' +
  'rgba(0,0,0,0.1) 90%, ' +
  'transparent 100%)'

export function Screen({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function update() {
      if (!el) return
      setShowTop(el.scrollTop > FADE_THRESHOLD)
      setShowBottom(el.scrollTop + el.clientHeight < el.scrollHeight - FADE_THRESHOLD)
    }

    // ResizeObserver only fires on observed elements' bounding boxes.
    // The scroll container itself doesn't grow when its content does
    // (flex-1 fixes its height), and historically we only observed the
    // first child — which on most screens is the static back-button
    // row that never resizes. So the bottom fade wouldn't appear on
    // initial load even when there was content overflowing below.
    //
    // Fix: observe the scroll container and every direct child, and
    // also watch the child list with MutationObserver so newly mounted
    // children (e.g. AnimatePresence switching screens, lazy-loaded
    // sections) get observed too. Each observed mutation triggers an
    // update().
    const scrollEl = el
    const ro = new ResizeObserver(update)
    function reobserve() {
      ro.disconnect()
      ro.observe(scrollEl)
      for (const child of Array.from(scrollEl.children)) ro.observe(child)
    }
    reobserve()
    update()
    // Once more after the next paint so any first-frame layout shift
    // (motion.section's initial y offset etc.) is reflected.
    const raf = requestAnimationFrame(update)

    el.addEventListener('scroll', update, { passive: true })

    const mo = new MutationObserver(() => {
      reobserve()
      update()
    })
    mo.observe(el, { childList: true })

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', update)
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="relative flex-1 flex flex-col min-h-0"
    >
      <div
        ref={scrollRef}
        className={`flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-contain ${className}`}
      >
        {children}
      </div>

      {/* Top fade — extends through the device safe-area inset so
          in standalone (PWA) mode the gradient reaches the very top
          of the viewport, gently veiling the status bar instead of
          stopping at the content edge. In Safari `env(...)` resolves
          to 0, so the strip lands flush at the top of the scroll
          area as before — no branching needed for browser vs PWA. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 transition-opacity duration-200 ease-out"
        style={{
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          height: `calc(${FADE_HEIGHT}px + env(safe-area-inset-top, 0px))`,
          opacity: showTop ? 1 : 0,
          background: FADE_BG_TOP,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maskImage: FADE_MASK_TOP,
          WebkitMaskImage: FADE_MASK_TOP,
        }}
      />

      {/* Bottom fade — mirror of the top, extends through
          `safe-area-inset-bottom` so the home-indicator area on iOS
          gets the same soft veil in PWA mode. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 transition-opacity duration-200 ease-out"
        style={{
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          height: `calc(${FADE_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          opacity: showBottom ? 1 : 0,
          background: FADE_BG_BOTTOM,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maskImage: FADE_MASK_BOTTOM,
          WebkitMaskImage: FADE_MASK_BOTTOM,
        }}
      />
    </motion.div>
  )
}
