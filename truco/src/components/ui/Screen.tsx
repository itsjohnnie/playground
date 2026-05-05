import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const transition = { duration: 0.24, ease: [0.23, 1, 0.32, 1] as const }
const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
}

// How much scroll headroom (in px) we need above/below before we
// fade in the corresponding edge. Small dead zone so a 1px wobble
// doesn't flicker the overlays.
const FADE_THRESHOLD = 4
// Height of the fade gradient + blur strip at each edge.
const FADE_HEIGHT = 28

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
        className={`flex-1 overflow-y-auto overscroll-contain ${className}`}
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
          background: 'linear-gradient(to bottom, hsl(var(--bg)) 0%, hsl(var(--bg) / 0.6) 55%, transparent 100%)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%)',
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
          background: 'linear-gradient(to top, hsl(var(--bg)) 0%, hsl(var(--bg) / 0.6) 55%, transparent 100%)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maskImage: 'linear-gradient(to top, #000 0%, #000 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, #000 0%, #000 60%, transparent 100%)',
        }}
      />
    </motion.div>
  )
}
