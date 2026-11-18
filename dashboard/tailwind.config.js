/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marino: { DEFAULT: '#0f2342', profundo: '#0a1830' },
        enes: { DEFAULT: '#1d4ed8', suave: '#dbeafe', claro: '#60a5fa' },
        visita: { DEFAULT: '#c2410c', suave: '#ffedd5', claro: '#fb923c' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
