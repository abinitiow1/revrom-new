/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './data/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#FF9100',
          'primary-dark': '#E68200',
          'accent-gold': '#FFB800',
          black: '#000000',
          'mechanical-grey': '#1A1A1A',
        },
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: 'var(--color-card)',
        'muted-foreground': 'var(--color-muted-foreground)',
        border: 'var(--color-border)',
        'dark-background': 'var(--color-dark-background)',
        'dark-foreground': 'var(--color-dark-foreground)',
        'dark-card': 'var(--color-dark-card)',
        'dark-muted-foreground': 'var(--color-dark-muted-foreground)',
        'dark-border': 'var(--color-dark-border)',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'adventure': '0 10px 40px -10px rgba(255, 145, 0, 0.4)',
        'adventure-dark': '0 20px 60px -15px rgba(0, 0, 0, 0.95)',
        'inner-soft': 'inset 0 2px 6px 0 rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
    },
  },
  plugins: [],
};
