/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'oklch(0.14 0.02 280)',
        foreground: 'oklch(0.97 0.01 300)',
        muted: 'oklch(0.7 0.04 295 / 0.4)',
        'muted-foreground': 'oklch(0.7 0.04 295)',
        card: 'oklch(0.17 0.025 280)',
        primary: 'oklch(0.7 0.22 305)',
        gold: 'oklch(0.72 0.22 310)',
        'gold-soft': 'oklch(0.55 0.18 320)',
        destructive: 'oklch(0.62 0.24 20)',
        border: 'oklch(0.4 0.06 295 / 0.25)',
        input: 'oklch(0.3 0.05 290)',
        ring: 'oklch(0.7 0.22 305 / 0.6)',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        'xl': '1rem',
        base: '0.875rem'
      }
    },
  },
  plugins: [],
}
