/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdfaf2',
          100: '#faf2db',
          200: '#f4e3b3',
          300: '#edd083',
          400: '#e2b34c',
          500: '#d4af37',
          600: '#b8912b',
          700: '#997424',
          800: '#7d5c21',
          900: '#664b1d',
          950: '#3b2a0e',
        },
        champagne: '#F5E6D3',
        bronze: '#C5A880',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
