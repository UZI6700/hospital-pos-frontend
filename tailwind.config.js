/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { primary: { DEFAULT: '#1E40AF', light: '#2563EB', dark: '#1E3A8A' } },
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'Roboto', 'system-ui', 'sans-serif'] },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { 'fade-in': 'fade-in .25s ease-out', 'scale-in': 'scale-in .18s ease-out', 'slide-in': 'slide-in .2s ease-out' },
    },
  },
  plugins: [],
}
