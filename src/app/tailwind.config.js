/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 👈 keeps site light-only
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#2A7C7C", // MergifyPDF brand color
      },

      // ✅ Add merge animation keyframes
      keyframes: {
        squareA: {
          "0%": { transform: "translate(-60%, -60%) rotate(-12deg)" },
          "50%": { transform: "translate(0%, 0%) rotate(0deg)" },
          "100%": { transform: "translate(-60%, -60%) rotate(-12deg)" },
        },
        squareB: {
          "0%": { transform: "translate(60%, 60%) rotate(12deg)" },
          "50%": { transform: "translate(0%, 0%) rotate(0deg)" },
          "100%": { transform: "translate(60%, 60%) rotate(12deg)" },
        },
      },

      // ✅ Add animation utilities
      animation: {
        squareA: "squareA 1.4s ease-in-out infinite",
        squareB: "squareB 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
