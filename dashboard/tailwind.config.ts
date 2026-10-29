import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1E2433",
        paper: "#F6F7FB",
        brand: { DEFAULT: "#3355E8", dark: "#2441C4", soft: "#EAEFFF" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", '"Segoe UI"', "system-ui", "-apple-system", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
