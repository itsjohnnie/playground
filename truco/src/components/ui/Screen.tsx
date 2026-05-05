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
export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.16, ease: EASE } },
}

export function Screen({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className={`flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-contain ${className}`}
    >
      {children}
    </motion.div>
  )
}
