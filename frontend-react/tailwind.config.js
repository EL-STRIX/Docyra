/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0F5C5C',
          'primary-hover': '#0B4747',
          'primary-light': '#E6F2F1',
          'primary-dark': '#004343',
          accent: '#F2A93B',
          'accent-hover': '#D99228',
          'accent-light': '#FEF6EC',
        },
        neutral: {
          bg: '#FAFAF8',
          surface: '#FFFFFF',
          border: '#E7E5E0',
          'text-primary': '#1A2E2E',
          'text-secondary': '#5C6B6B',
        },
        semantic: {
          success: '#2E9E6B',
          warning: '#F2A93B',
          error: '#D9534F',
          info: '#6C757D',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'docyra-card': '0 8px 24px rgba(15, 92, 92, 0.08)',
        'docyra-hover': '0 14px 36px rgba(15, 92, 92, 0.14)',
        'docyra-elevated': '0 20px 48px rgba(15, 92, 92, 0.16)',
      },
      borderRadius: {
        'card': '18px',
        'pill': '9999px',
      },
    },
  },
  plugins: [],
};
