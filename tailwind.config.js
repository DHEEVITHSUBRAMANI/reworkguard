/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          850: '#0c1322',
          900: '#0a0f1d',
          950: '#060a14',
        },
        sidebar: {
          bg: '#0F172A',
          hover: '#1E293B',
          active: '#2563EB',
          text: '#94A3B8',
          'text-bright': '#F8FAFC',
          border: '#1E293B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
