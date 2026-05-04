// Spanish-deck suit glyphs (baraja española): oro, copa, espada, basto.
// Stylised silhouettes, sized to follow the parent's font-size.
// All shapes use currentColor; render on a solid background.

import type { SVGProps } from 'react'

const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
} as const

export function Oro(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Copa(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5.4 3.5 H18.6 V5 C18.6 9.2 15.6 12.6 12 13 C8.4 12.6 5.4 9.2 5.4 5 Z" />
      <rect x="11.2" y="13" width="1.6" height="5" />
      <rect x="7" y="18.4" width="10" height="1.8" rx="0.5" />
    </svg>
  )
}

export function Espada(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} fill="currentColor" aria-hidden="true" {...props}>
      {/* Blade pointing up */}
      <path d="M12 2.5 L13.4 16 H10.6 Z" />
      {/* Crossguard */}
      <rect x="5.6" y="16" width="12.8" height="1.6" rx="0.4" />
      {/* Grip */}
      <rect x="11.2" y="17.6" width="1.6" height="2.6" />
      {/* Pommel */}
      <circle cx="12" cy="21" r="1.4" />
    </svg>
  )
}

export function Basto(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} fill="currentColor" aria-hidden="true" {...props}>
      {/* Top knob */}
      <ellipse cx="12" cy="3.5" rx="2" ry="1" />
      {/* Tapered shaft */}
      <path d="M10 3.5 H14 L14.7 19.5 H9.3 Z" />
      {/* Foot */}
      <ellipse cx="12" cy="19.8" rx="2.7" ry="1.1" />
    </svg>
  )
}
