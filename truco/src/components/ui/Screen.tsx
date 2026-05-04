import { motion } from 'framer-motion'

const transition = { duration: 0.24, ease: [0.23, 1, 0.32, 1] as const }
const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
}

export function Screen({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className={`flex-1 flex flex-col ${className}`}
    >
      {children}
    </motion.div>
  )
}
