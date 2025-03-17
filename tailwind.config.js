/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./templates/**/*.{html,js}", "./static/**/*.{js,jsx}", "*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        'roboto': ['"Roboto Condensed"', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6b6b',
          500: '#ff3e3e',
          600: '#ff1f1f',
          700: '#e60000',
          800: '#bd0000',
          900: '#9b0000',
          950: '#560000',
          DEFAULT: '#b80404',
          light: '#fef2f2',
          hover: '#940303',
          beige: '#f5f5cd'
        },
        sidebar: {
          DEFAULT: '#ffffff',
          hover: '#fef2f2',
          active: '#fff1f1',
          border: '#f3f4f6'
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'page-gradient': 'linear-gradient(135deg, #fff5f5 0%, #fff 50%, #fef2f2 100%)',
        'btn-gradient': 'linear-gradient(to right, var(--tw-gradient-stops))',
        'btn-gradient-hover': 'linear-gradient(to right, var(--tw-gradient-stops))'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        slideRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' }
        },
        slideLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s infinite',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-right': 'slideRight 1s forwards',
        'slide-left': 'slideLeft 1s forwards'
      },
      transitionProperty: {
        'width': 'width',
        'height': 'height',
        'spacing': 'margin, padding',
      },
      boxShadow: {
        'btn': '0 4px 6px -1px rgba(234, 88, 88, 0.1), 0 2px 4px -1px rgba(234, 88, 88, 0.06)',
        'btn-hover': '0 10px 15px -3px rgba(234, 88, 88, 0.2), 0 4px 6px -2px rgba(234, 88, 88, 0.1)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }
    }
  },
  plugins: [],
}

