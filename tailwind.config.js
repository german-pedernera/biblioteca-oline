/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dashboard': {
          'bg': '#F1F4F9',
          'sidebar': '#ffffff',
          'primary': '#7B66FF',
          'primary-light': '#9D8CFF',
          'accent': '#FF8C94',
          'orange': '#FFAE8F',
          'text': '#2D3436',
          'text-muted': '#636E72',
          'card': '#ffffff',
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(123, 102, 255, 0.12)',
        'soft': '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
        'card': '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
