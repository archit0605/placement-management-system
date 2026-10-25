/** @type {import('tailwindcss').Config} */

const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        paper: token('paper'),
        sheet: token('sheet'),
        ink: {
          DEFAULT: token('ink'),
          2: token('ink-2'),
          3: token('ink-3'),
        },
        rule: {
          DEFAULT: token('rule'),
          strong: token('rule-strong'),
        },
        accent: {
          DEFAULT: token('accent'),
          strong: token('accent-strong'),
          soft: token('accent-soft'),
        },
        ok: { DEFAULT: token('ok'), soft: token('ok-soft') },
        bad: { DEFAULT: token('bad'), soft: token('bad-soft') },
        warn: { DEFAULT: token('warn'), soft: token('warn-soft') },
      },
      borderRadius: {
        sheet: '10px',
      },
      keyframes: {
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'grow-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'draw-in': {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
      },
      animation: {
        'page-in': 'page-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 0.16s cubic-bezier(0.16, 1, 0.3, 1) both',
        'grow-x': 'grow-x 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'draw-in': 'draw-in 1.1s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
