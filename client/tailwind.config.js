/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          500: "#1f7ae0",
          600: "#1763b8",
          700: "#134f91"
        }
      }
    }
  },
  plugins: []
};
