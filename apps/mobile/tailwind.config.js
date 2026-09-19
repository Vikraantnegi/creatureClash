const { platformSelect } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './index.ts',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: platformSelect({
          ios: 'Helvetica',
          android: 'sans-serif',
          default: 'Helvetica, Arial, sans-serif',
        }),
        mono: platformSelect({
          ios: 'Menlo',
          android: 'monospace',
          default: 'ui-monospace, Menlo, monospace',
        }),
      },
      colors: {
        paper: '#F3EEE4',
        card: '#FBF9F4',
        ink: '#1F1B18',
        muted: '#6A635C',
        rust: '#8A3A22',
        line: '#CEC6B8',
        ground: '#E2DACA',
      },
    },
  },
  plugins: [],
};
