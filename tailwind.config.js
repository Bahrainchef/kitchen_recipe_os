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
        canvas: '#F8F4EE',
        surface: '#FFFFFF',
        'surface-warm': '#FDFAF3',
        text: {
          primary: '#1A1714',
          secondary: '#4A4540',
          muted: '#9A9490',
        },
        ink: {
          border: 'rgba(26,23,20,0.09)',
          'border-mid': 'rgba(26,23,20,0.14)',
          subtle: 'rgba(26,23,20,0.05)',
        },
        gold: {
          DEFAULT: '#C8973A',
          light: '#E0B060',
          dim: '#A07828',
          pale: '#F5EDD8',
          border: 'rgba(200,151,58,0.30)',
        },
      },
      screens: {
        tablet: '768px',
        desktop: '1280px',
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,23,20,0.04), 0 2px 8px rgba(26,23,20,0.06)',
        'card-hover': '0 4px 12px rgba(26,23,20,0.08), 0 12px 32px rgba(26,23,20,0.10)',
        'gold-ring': '0 0 0 1px rgba(200,151,58,0.30), 0 2px 12px rgba(200,151,58,0.10)',
      },
    },
  },
  plugins: [],
}
