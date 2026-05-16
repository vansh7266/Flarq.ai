import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#07080a',
        background: '#07080a',
        surface: '#0f1117',
        card: '#161821',
        border: '#1e2030',
        muted: '#6b7094',
        text: '#e4e6ef',
        'text-primary': '#e4e6ef',
        'text-secondary': '#a0a3b1',
        'text-muted': '#6b7094',
        primary: {
          DEFAULT: '#7c5cfc',
          light: '#9d85fd',
          dark: '#6344f5',
        },
        accent: '#38bdf8',
        'accent-light': 'rgba(56, 189, 248, 0.12)',
        amber: '#f5a623',
        emerald: '#34d399',
        rose: '#f472b6',
        sky: '#38bdf8',
        danger: '#ef4444',
        success: '#34d399',
        warning: '#f5a623',
        white: '#ffffff',
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 92, 252, 0.4)',
        soft: '0 24px 80px -40px rgba(0, 0, 0, 0.65)',
      },
      keyframes: {
        drawIn: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(124, 92, 252, 0.4)' },
          '50%': { boxShadow: '0 0 0 16px rgba(124, 92, 252, 0)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        ripple: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'draw-in': 'drawIn 1.5s ease-out forwards',
        float: 'float 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'orbit-slow': 'orbit 14s linear infinite',
        'orbit-med': 'orbit 10s linear infinite',
        'orbit-fast': 'orbit 6s linear infinite',
        ripple: 'ripple 2s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
        blink: 'blink 1s step-end infinite',
        wave: 'wave 1.2s ease-in-out infinite',
        fadeUp: 'fadeUp 0.5s ease-out forwards',
        scaleIn: 'scaleIn 0.3s ease-out forwards',
      },
    },
  },
  plugins: [
    typography,
    plugin(({ addComponents }) => {
      addComponents({
        '.teal-cta': {
          backgroundColor: '#7c5cfc',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#6344f5',
          },
        },
      })
    }),
  ],
} satisfies Config
