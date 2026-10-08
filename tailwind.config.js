/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F1117',
          surface: '#161922',
          card: '#1E2230',
          cardHover: '#262B3D',
          border: '#2C3246',
          input: '#12141D',
        },
        light: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          cardHover: '#F1F5F9',
          border: '#E2E8F0',
          input: '#F8FAFC',
        },
        amazon: {
          orange: '#FF9900',
          orangeHover: '#E68A00',
          yellow: '#FFD814',
          yellowHover: '#F7CA00',
          dark: '#131921',
          navy: '#232F3E',
          blue: '#007185',
          price: '#B12704',
          prime: '#00A8E1',
          border: '#D5D9D9'
        }
      }
    },
  },
  plugins: [],
}
