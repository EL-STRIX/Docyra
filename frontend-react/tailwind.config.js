/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        docyra: {
          primary: '#0F5C5C',
          'primary-light': '#E6F2F1',
          'primary-dark': '#0B4747',
          accent: '#F2A93B',
          'accent-hover': '#DF9628',
          'neutral-bg': '#FAFAF8',
          'neutral-surface': '#FFFFFF',
          'neutral-border': '#E7E5E0',
          'text-primary': '#1A2E2E',
          'text-secondary': '#5C6B6B',
          success: '#2E9E6B',
          warning: '#F2A93B',
          error: '#D9534F',
          info: '#6C757D'
        }
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'Manrope', 'sans-serif'],
      },
      boxShadow: {
        'docyra-card': '0 8px 24px rgba(15, 92, 92, 0.08)',
        'docyra-hover': '0 12px 32px rgba(15, 92, 92, 0.12)'
      },
      borderRadius: {
        'card': '16px',
        'card-lg': '20px',
        'pill': '9999px'
      }
    },
  },
  plugins: [],
}
