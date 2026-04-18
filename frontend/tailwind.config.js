/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // tiny theme tweak: slightly different brand shade
        brand: '#14B8A6',
      },
    },
  },
  plugins: [],
}

