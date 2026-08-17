/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6D4AFF',
          50: '#F3F0FF',
          100: '#E9E3FF',
          200: '#D3C9FF',
          300: '#B3A3FF',
          400: '#8F79FF',
          500: '#6D4AFF',
          600: '#5B3AE0',
          700: '#4A2EBD',
          800: '#3B2494',
          900: '#2E1C73',
        },
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'brand-grad': 'linear-gradient(135deg,#6D4AFF 0%,#8F79FF 100%)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04)',
        'card-hover': '0 18px 40px -26px rgba(15,23,42,.28)',
      },
    },
  },
  plugins: [],
}
