/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charlotte: {
          green: {
            dark: '#24824A',
            light: '#71BF44',
            legacy: '#007953',
          },
          black: '#141E28',
          navy: '#0C1C35',
          blue: '#2F70B8',
          'blue-med': '#02508E',
          yellow: '#FADD4A',
          orange: '#EA983E',
          red: '#DE0505',
          'red-dark': '#C70000',
          teal: {
            dark: '#0A7D8C',
            light: '#00A79C',
          },
          purple: '#59489F',
        },
      },
      fontFamily: {
        sans: ['"Proxima Nova"', '"Century Gothic"', 'CenturyGothic', 'AppleGothic', 'sans-serif'],
        serif: ['"Mrs Eaves XL Serif Nar OT"', 'Cambria', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
