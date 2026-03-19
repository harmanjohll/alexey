/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'lab-bg': '#0d1117',
        'lab-surface': '#161b22',
        'lab-panel': '#1c2128',
        'lab-border': '#30363d',
        'lab-green': '#3fb950',
        'lab-blue': '#58a6ff',
        'lab-orange': '#f0883e',
        'lab-red': '#f85149',
        'lab-text': '#e6edf3',
        'lab-muted': '#8b949e',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
