/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/**/*.{tsx,ts}',
    './src/renderer/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg-color)',
        card: 'var(--card-color)',
        border: 'var(--border-color)',
        hover: 'var(--hover-color)',
        accent: 'var(--accent-color)',
        text: 'var(--text-color)',
        muted: 'var(--text-muted)',
      },
      fontFamily: {
        sans: ['"Inter"', 'Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
