/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#960C01',
          foreground: '#FFFFFF',
          tint: 'rgb(150 12 1 / 0.2)',
        },
        background: 'var(--background)',
        focus: '#0B0F2B',
        error: {
          DEFAULT: '#960C01',
          foreground: '#FFFFFF',
        },
        disabled: {
          DEFAULT: '#767B89',
          foreground: '#FFFFFF',
        },
        stroke: '#979797',
        surface: '#F4F4F4',
        'muted-fg': '#767B89',
        'chart-neutral': 'rgb(151 151 151 / 0.6)',
        'icon-tile': '#E5E5E5',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'sans-serif'],
      },
      fontSize: {
        heading: ['clamp(2.5rem, 3.33vw, 4rem)', { lineHeight: '1.1' }],
        subheading: ['clamp(2rem, 2.5vw, 3rem)', { lineHeight: '1.2' }],
        'page-title': ['clamp(1.75rem, 2.08vw, 2.5rem)', { lineHeight: '1.2' }],
        'banner-title': ['clamp(1.75rem, 2.08vw, 2.5rem)', { lineHeight: '1.2' }],
        'kpi-value': ['clamp(1.5rem, 1.875vw, 2.25rem)', { lineHeight: '1.2' }],
        'card-title': ['clamp(1.125rem, 1.04vw, 1.25rem)', { lineHeight: '1.3' }],
        body: ['clamp(1rem, 1.04vw, 1.25rem)', { lineHeight: '1.4' }],
        label: ['1rem', { lineHeight: '1.25' }],
        caption: ['0.875rem', { lineHeight: '1.3' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
