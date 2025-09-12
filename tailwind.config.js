/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        congoleseBlue: '#0072CE', // DRC flag blue
        congoleseRed: '#CE1126', // DRC flag red
        congoleseYellow: '#FFC107', // DRC flag yellow
      },
    },
  },
  plugins: [],
};