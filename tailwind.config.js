/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#024d7c",
      },
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
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
        numberRoll: {
          "0%": { transform: "translateY(8px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
      },
      animation: {
        squareA: "squareA 1.4s ease-in-out infinite",
        squareB: "squareB 1.4s ease-in-out infinite",
        "spin-slow": "spinSlow 2s linear infinite",
        numberRoll: "numberRoll 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
