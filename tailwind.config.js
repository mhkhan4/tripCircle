/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#7C3AED',
        accent: '#F59E0B',
        success: '#10B981',
        danger: '#EF4444',
        surface: '#F8FAFC',
        muted: '#94A3B8',
      },
    },
  },
  plugins: [],
};
