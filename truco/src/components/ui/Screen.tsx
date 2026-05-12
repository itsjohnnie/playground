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

    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // Children mounting/unmounting can change scrollHeight without firing
    // either of the above; observe the inner content as well.
    const inner = el.firstElementChild
    if (inner) ro.observe(inner)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
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

      {/* Top fade — visible only when content has been scrolled down past
          the threshold. Backdrop-blur softens whatever is sliding under it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-200 ease-out"
        style={{
          height: FADE_HEIGHT,
          opacity: showTop ? 1 : 0,
          background: FADE_BG_TOP,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maskImage: FADE_MASK_TOP,
          WebkitMaskImage: FADE_MASK_TOP,
        }}
      />

      {/* Bottom fade — mirror of the top, shown when there's more
          content below the visible area. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 transition-opacity duration-200 ease-out"
        style={{
          height: FADE_HEIGHT,
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
