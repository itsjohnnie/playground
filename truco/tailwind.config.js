/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          900: '#0d2b1a',
          800: '#1a4a2e',
          700: '#1f5c38',
          600: '#256b40',
        },
        gold: {
          300: '#f5e6a3',
          400: '#e8cc6a',
          500: '#D4AF37',
          600: '#b8962e',
          700: '#9a7a22',
        },
        malas: '#8B1A1A',
        buenas: '#2d6a1a',
        wood: {
          900: '#2c1a0a',
          800: '#3d2410',
          700: '#4a2c0a',
          600: '#6b3f10',
        },
        cream: '#F5E6C8',
        parchment: '#f0d9a0',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Crimson Text"', 'Georgia', 'serif'],
      },
      animation: {
        'stick-in': 'stickIn 0.35s ease-out forwards',
        'cross-in': 'crossIn 0.3s ease-out forwards',
        'pop': 'pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'win-burst': 'winBurst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'shake': 'shake 0.4s ease-in-out',
      },
      keyframes: {
        stickIn: {
          '0%': { transform: 'scaleY(0) translateY(-50%)', opacity: '0' },
          '100%': { transform: 'scaleY(1) translateY(0)', opacity: '1' },
        },
        crossIn: {
          '0%': { transform: 'rotate(-45deg) scaleX(0)', opacity: '0' },
          '100%': { transform: 'rotate(-45deg) scaleX(1)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(212,175,55,0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(212,175,55,0.8)' },
        },
        winBurst: {
          '0%': { transform: 'scale(0.3) rotate(-10deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
}
