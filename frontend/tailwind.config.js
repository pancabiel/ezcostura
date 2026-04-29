/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontSize: {
        // tablet-friendly defaults
        base: ['1.0625rem', '1.5rem'],
      },
    },
  },
  plugins: [],
};
