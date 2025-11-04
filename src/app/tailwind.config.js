/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 👈 keeps site light-only
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#2A7C7C", // MergifyPDF brand color
      },

      // ✅ Keyframes (merge + spin)
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
        // ✅ New slow spin animation for logo
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
      },

      // ✅ Animation utilities
      animation: {
        squareA: "squareA 1.4s ease-in-out infinite",
        squareB: "squareB 1.4s ease-in-out infinite",
        "spin-slow": "spinSlow 2s linear infinite", // <— new line
      },
    },
  },
  plugins: [],
};
