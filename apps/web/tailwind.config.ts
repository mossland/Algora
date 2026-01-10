import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf8',
          100: '#d1fae9',
          200: '#a7f3d5',
          300: '#6ee7bc',
          400: '#34d99e',
          500: '#16f6ab',
          600: '#00c2c2',
          700: '#0080e8',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        agora: {
          // Light theme (moss.land style)
          dark: '#ffffff',
          darker: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b',
          primary: '#16f6ab',
          secondary: '#00c2c2',
          tertiary: '#0080e8',
          success: '#10b981',
          accent: '#00c2c2',
          warning: '#f59e0b',
          error: '#ef4444',
        },
        moss: {
          primary: '#16f6ab',
          secondary: '#00c2c2',
          tertiary: '#0080e8',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'highlight': 'highlight 2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        // Terminal animations
        'cursor-blink': 'cursorBlink 1.06s step-end infinite',
        'scanline': 'scanline 8s linear infinite',
        'terminal-glow': 'terminalGlow 2s ease-in-out infinite',
        'glyph-pulse': 'glyphPulse 1.5s ease-in-out infinite',
        'border-draw': 'borderDraw 0.6s ease-out forwards',
        'typing': 'typing 0.1s steps(1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        highlight: {
          '0%': { backgroundColor: 'rgba(22, 246, 171, 0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Terminal keyframes
        cursorBlink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        terminalGlow: {
          '0%, 100%': {
            textShadow: '0 0 5px rgba(22, 246, 171, 0.5), 0 0 10px rgba(22, 246, 171, 0.3)'
          },
          '50%': {
            textShadow: '0 0 10px rgba(22, 246, 171, 0.8), 0 0 20px rgba(22, 246, 171, 0.5), 0 0 30px rgba(22, 246, 171, 0.3)'
          },
        },
        glyphPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.15)' },
        },
        borderDraw: {
          '0%': { clipPath: 'inset(0 100% 100% 0)' },
          '25%': { clipPath: 'inset(0 0 100% 0)' },
          '50%': { clipPath: 'inset(0 0 0 100%)' },
          '75%': { clipPath: 'inset(100% 0 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        typing: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      // Animation delay utilities
      animationDelay: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },
    },
  },
  plugins: [],
};

export default config;
