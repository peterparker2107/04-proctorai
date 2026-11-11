/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
      },
      colors: {
        clinical: {
          bg: 'oklch(0.98 0.005 25)',
          paper: '#FFFFFF',
          card: '#FBFBFC',
          border: '#E2E8F0',
          muted: '#64748B',
        },
        forensic: {
          red: 'oklch(0.55 0.22 25)',
          redLight: 'oklch(0.95 0.05 25)',
          redBorder: 'oklch(0.75 0.15 25)',
          dark: '#0F172A',
          darker: '#090D16',
          navy: '#1E293B',
          gray: '#334155',
          gold: '#D97706',
          green: '#10B981',
          greenLight: '#ECFDF5',
        }
      },
      boxShadow: {
        'forensic': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06)',
        'forensic-card': '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'forensic-alert': '0 0 25px -3px rgba(220, 38, 38, 0.35)',
      }
    },
  },
  plugins: [],
}
