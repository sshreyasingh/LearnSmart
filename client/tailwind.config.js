export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#C9EDDC',
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
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
        },
      },
      backgroundImage: {
        'gradient-theme': 'linear-gradient(135deg, #94DBBA 0%, #b3e8d0 50%, #94DBBA 100%)',
        'gradient-card': 'linear-gradient(135deg, #C9EDDC 0%, #d9f7e8 100%)',
      },
    },
  },
  plugins: [],
};
