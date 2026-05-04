import { useEffect, useState } from 'react'
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useTransform,
} from 'framer-motion'

const ICON_SRC = `${import.meta.env.BASE_URL}pwa-512.png`

const TILT_RANGE = 30 // degrees of tilt that map to the full glare sweep

interface AppIconProps {
  size?: number
  className?: string
}

export function AppIcon({ size = 112, className = '' }: AppIconProps) {
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)

  // Smooth the raw tilt so the glare doesn't jitter with sensor noise.
  const sx = useSpring(tiltX, { stiffness: 120, damping: 18, mass: 0.5 })
  const sy = useSpring(tiltY, { stiffness: 120, damping: 18, mass: 0.5 })

  const glareX = useTransform(sx, [-1, 1], ['10%', '90%'])
  const glareY = useTransform(sy, [-1, 1], ['10%', '90%'])
  const sheenAngle = useTransform(sx, [-1, 1], [80, 140])
  const tiltDeg = useTransform(sx, [-1, 1], [-6, 6])
  const pitchDeg = useTransform(sy, [-1, 1], [4, -4])

  const radialGlare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 22%, transparent 55%)`
  const sheen = useMotionTemplate`linear-gradient(${sheenAngle}deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)`

  const [needsPermission, setNeedsPermission] = useState(() => {
    if (typeof window === 'undefined') return false
    return typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
      .requestPermission === 'function'
  })
  const [granted, setGranted] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (needsPermission && !granted) return

    const onOrient = (e: DeviceOrientationEvent) => {
      tiltX.set(clamp((e.gamma ?? 0) / TILT_RANGE, -1, 1))
      // Beta ranges -180..180; assume the user holds the phone tilted ~45° from flat
      // and treat that as neutral. Subtract before normalizing.
      tiltY.set(clamp(((e.beta ?? 45) - 45) / TILT_RANGE, -1, 1))
    }

    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [tiltX, tiltY, needsPermission, granted])

  // Desktop fallback: follow the pointer.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(pointer: coarse)').matches) return

    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      tiltX.set(clamp(x, -1, 1))
      tiltY.set(clamp(y, -1, 1))
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [tiltX, tiltY])

  async function enable() {
    try {
      const result = await (
        DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
      ).requestPermission()
      if (result === 'granted') {
        setGranted(true)
        setNeedsPermission(false)
      }
    } catch {
      // user dismissed; nothing to do
    }
  }

  return (
    <motion.button
      type="button"
      onClick={needsPermission ? enable : undefined}
      style={{
        width: size,
        height: size,
        rotateY: tiltDeg,
        rotateX: pitchDeg,
        transformPerspective: 600,
      }}
      className={`relative overflow-hidden rounded-[22%] shadow-1 select-none no-select ${className}`}
      aria-label="Truco"
      whileTap={needsPermission ? { scale: 0.97 } : undefined}
    >
      <img
        src={ICON_SRC}
        alt=""
        draggable={false}
        className="absolute inset-0 size-full object-cover"
      />

      {/* Glass glare — radial highlight that follows tilt */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{ background: radialGlare }}
      />
      {/* Diagonal sheen */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-screen opacity-80"
        style={{ background: sheen }}
      />
      {/* Subtle inner edge for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[22%] ring-1 ring-inset ring-white/10"
      />
    </motion.button>
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
