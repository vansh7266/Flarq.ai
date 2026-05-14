import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0d9488',
        'primary-hover': '#0f766e',
        'primary-light': '#ccfbf1',
        accent: '#0891b2',
        'accent-light': '#cffafe',
        background: '#ffffff',
        surface: '#f8fafc',
        'surface-elevated': '#f1f5f9',
        border: '#e2e8f0',
        'text-primary': '#0f172a',
        'text-secondary': '#475569',
        'text-muted': '#94a3b8',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 12px 30px -14px rgba(13, 148, 136, 0.55)',
        soft: '0 18px 50px -28px rgba(15, 23, 42, 0.28)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(13, 148, 136, 0)' },
          '50%': { boxShadow: '0 0 0 12px rgba(13, 148, 136, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        drawIn: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        orbit: {
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
        'draw-in': 'drawIn 2s ease forwards',
        orbit: 'orbit 8s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
