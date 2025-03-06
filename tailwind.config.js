/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.{html,js}",
    "./static/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
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
          hover: '#940303'
        }
      },
    }
  },
  plugins: [],
}
  

