/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        fraunces: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas:  '#0B1F4A',
        surface: '#0D2354',
        panel:   '#122347',
        card:    '#1A2F5E',
        text: {
          primary:   '#f0f4ff',
          secondary: 'rgba(240,244,255,0.65)',
          muted:     'rgba(240,244,255,0.35)',
        },
        pink: {
          DEFAULT: '#f090b8',
          deep:    '#d4608e',
          soft:    'rgba(240,144,184,0.12)',
          border:  'rgba(240,144,184,0.15)',
        },
        blue: {
          DEFAULT: '#7eb8f7',
          deep:    '#4a90d9',
          soft:    'rgba(126,184,247,0.10)',
          border:  'rgba(126,184,247,0.12)',
        },
        teal: {
          DEFAULT: '#4ecdc4',
          soft:    'rgba(78,205,196,0.10)',
        },
        border: {
          DEFAULT: 'rgba(100,150,240,0.35)',
          pink:    'rgba(240,144,184,0.15)',
        },
      },
      screens: {
        tablet: '768px',
        desktop: '1280px',
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card:    '0 2px 12px rgba(0,0,0,0.40), 0 1px 3px rgba(0,0,0,0.25)',
        'pink-glow':  '0 8px 32px rgba(240,144,184,0.18)',
        'blue-glow':  '0 8px 32px rgba(126,184,247,0.14)',
        'teal-glow':  '0 8px 32px rgba(78,205,196,0.14)',
      },
    },
  },
  plugins: [],
}
