/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#10b981'
        }
      }
    }
  },
  darkMode: 'class',
  plugins: []
}
