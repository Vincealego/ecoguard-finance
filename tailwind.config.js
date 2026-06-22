/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B6E4F',
          50: '#E8F5EF',
          100: '#C9E8DA',
          200: '#9AD6BC',
          300: '#6BC39D',
          400: '#3CAF7F',
          500: '#0B6E4F',
          600: '#095F44',
          700: '#074E37',
          800: '#053D2B',
          900: '#032C1F',
          950: '#021E15',
        },
        secondary: {
          DEFAULT: '#1F9D55',
          50: '#EAFBF0',
          100: '#CDF5DC',
          200: '#9BEBBB',
          300: '#69E099',
          400: '#37D578',
          500: '#1F9D55',
          600: '#1A8548',
          700: '#156D3B',
          800: '#10552E',
          900: '#0B3D21',
        },
        accent: {
          DEFAULT: '#F59E0B',
          50: '#FEF6E7',
          100: '#FDEAC4',
          200: '#FBD589',
          300: '#F9C04E',
          400: '#F7AB28',
          500: '#F59E0B',
          600: '#D6850A',
          700: '#A8680A',
          800: '#7A4B07',
          900: '#4D2F04',
        },
        surface: '#F8FAFC',
        ink: '#0F172A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 6px -1px rgba(15, 23, 42, 0.06)',
        cardHover: '0 4px 12px -2px rgba(15, 23, 42, 0.10), 0 2px 6px -2px rgba(15, 23, 42, 0.06)',
        elevated: '0 8px 24px -4px rgba(15, 23, 42, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
