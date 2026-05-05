// Theme: 'auto' | 'light' | 'dark'. 'auto' follows the OS preference. The
// resolved theme is applied as `data-theme="dark"` or `data-theme="light"`
// on the <html> element. A small inline script in index.html does the
// initial application before React mounts to avoid a flash of the wrong
// theme. After mount, this module keeps everything in sync.

export type ThemeChoice = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const KEY = 'truco.theme.v1'
// Fallbacks if --meta-bg isn't yet readable (called pre-CSS-parse).
const META_FALLBACK = {
  dark: '#0E1110',
  light: '#f6f3ee',
}

type Listener = (choice: ThemeChoice, resolved: ResolvedTheme) => void
const listeners = new Set<Listener>()

export function getThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'auto') return v
  } catch { /* no storage */ }
  return 'auto'
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function getResolvedTheme(): ResolvedTheme {
  const choice = getThemeChoice()
  return choice === 'auto' ? getSystemTheme() : choice
}

export function applyTheme() {
  const resolved = getResolvedTheme()
  document.documentElement.dataset.theme = resolved
  // Update iOS status bar / browser chrome color. Pull the hex straight
  // from the active theme's --meta-bg so it always matches the body bg.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  const fromVar = getComputedStyle(document.documentElement)
    .getPropertyValue('--meta-bg').trim()
  meta.content = fromVar || META_FALLBACK[resolved]
}

export function setThemeChoice(choice: ThemeChoice) {
  if (choice === 'auto') {
    try { localStorage.removeItem(KEY) } catch { /* swallow */ }
  } else {
    try { localStorage.setItem(KEY, choice) } catch { /* swallow */ }
  }
  applyTheme()
  const resolved = getResolvedTheme()
  listeners.forEach((l) => l(choice, resolved))
}

export function subscribeTheme(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

// React to OS-level dark/light flips while in 'auto'.
if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia('(prefers-color-scheme: light)')
  const onChange = () => {
    if (getThemeChoice() === 'auto') {
      applyTheme()
      const resolved = getResolvedTheme()
      listeners.forEach((l) => l('auto', resolved))
    }
  }
  if (mql.addEventListener) mql.addEventListener('change', onChange)
  else mql.addListener(onChange)
}
