import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', 'Fira Code', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        brand: '#294D4A',
        primary: {
          50: '#eefdf5',
          100: '#d4f7e3',
          200: '#abefcc',
          300: '#73e2ae',
          400: '#3acd8b',
          500: '#16b271',
          600: '#09905b',
          700: '#07734b',
          800: '#095b3d',
          900: '#094b33',
          950: '#042a1d',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        surface: {
          50: '#152522',
          100: '#1a302c',
          200: '#1f3b36',
          300: '#264740',
          350: '#2d524a',
          400: '#3a6359',
          500: '#59867a',
          600: '#7da99d',
          700: '#a3c4bb',
          800: '#c9dfd8',
          900: '#e8f3ef',
          950: '#f5faf8',
        },
        success: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.3), 0 10px 20px -2px rgba(0, 0, 0, 0.2)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.4), 0 2px 10px -2px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 30px rgba(16, 178, 113, 0.15)',
        'glow-lg': '0 0 60px rgba(16, 178, 113, 0.1)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 24px -2px rgba(0, 0, 0, 0.3), 0 12px 32px -4px rgba(0, 0, 0, 0.2)',
      },
      backgroundImage: {
        'gradient-theme': 'linear-gradient(135deg, #1a302c 0%, #152522 50%, #1f3b36 100%)',
        'gradient-card': 'linear-gradient(135deg, #1f3b36 0%, #152522 100%)',
        'gradient-hero': 'radial-gradient(circle at 50% 0%, rgba(58, 205, 139, 0.06) 0%, transparent 60%)',
        'gradient-hero-bottom': 'radial-gradient(circle at 50% 100%, rgba(58, 205, 139, 0.05) 0%, transparent 60%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.25s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'enter-stagger-1': 'fadeInUp 0.5s ease-out 0.1s both',
        'enter-stagger-2': 'fadeInUp 0.5s ease-out 0.2s both',
        'enter-stagger-3': 'fadeInUp 0.5s ease-out 0.3s both',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeInDown: { '0%': { opacity: '0', transform: 'translateY(-12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
      },
      transitionDuration: { '400': '400ms' },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({ '.text-balance': { 'text-wrap': 'balance' } });
    }),
  ],
};
