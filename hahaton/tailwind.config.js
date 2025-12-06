/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Manrope"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['"Manrope"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#e8f2ff',
          100: '#d0e5ff',
          200: '#a1cbff',
          300: '#72b1ff',
          400: '#4397ff',
          500: '#0d7dff',
          600: '#0a65cc',
          700: '#084c99',
          800: '#053266',
          900: '#031933',
        },
      },
    },
  },
  plugins: [],
};
