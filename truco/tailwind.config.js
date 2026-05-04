/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Only fire hover utilities on devices that actually support hover.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // Surface
        bg:         'hsl(var(--bg) / <alpha-value>)',
        surface:    'hsl(var(--surface) / <alpha-value>)',
        'surface-hi': 'hsl(var(--surface-hi) / <alpha-value>)',
        line:       'hsl(var(--line) / <alpha-value>)',
        // Ink
        ink:        'hsl(var(--ink) / <alpha-value>)',
        'ink-muted': 'hsl(var(--ink-muted) / <alpha-value>)',
        'ink-soft': 'hsl(var(--ink-soft) / <alpha-value>)',
        // Accent
        accent:     'hsl(var(--accent) / <alpha-value>)',
        'accent-hi': 'hsl(var(--accent-hi) / <alpha-value>)',
        'accent-ink': 'hsl(var(--accent-ink) / <alpha-value>)',
        // Suits
        'suit-red':   'hsl(var(--suit-red) / <alpha-value>)',
        'suit-black': 'hsl(var(--suit-black) / <alpha-value>)',
        // Status
        danger: 'hsl(var(--danger) / <alpha-value>)',
        win:    'hsl(var(--win) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        body:    ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': 'var(--fs-display-xl)',
        display:      'var(--fs-display)',
        h1:           'var(--fs-h1)',
        h2:           'var(--fs-h2)',
        eyebrow:      'var(--fs-eyebrow)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      transitionTimingFunction: {
        out:    'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        drawer: 'var(--ease-drawer)',
      },
      transitionDuration: {
        press:    'var(--dur-press)',
        popover:  'var(--dur-popover)',
        dialog:   'var(--dur-dialog-in)',
        sheet:    'var(--dur-sheet)',
        tally:    'var(--dur-tally)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
      },
    },
  },
  plugins: [],
}
