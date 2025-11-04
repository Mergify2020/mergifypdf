/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 👈 prevents system dark mode from affecting your app
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#2A7C7C", // MergifyPDF brand color
      },
    },
  },
  plugins: [],
};
