import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        gold: {
          DEFAULT: "#cab34c",
          lt: "#e8c97a",
          dk: "#a8922a",
        },
        cream: {
          DEFAULT: "#f5f0e8",
          bg: "#f5f0e8",
          card: "#faf7f2",
        },
        ink: {
          DEFAULT: "#1A1A1A",
          soft: "#555555",
        },
        dark: "#0a0a0a",
        black: "#000000",
      },
      fontFamily: {
        sans: ["var(--font-jost)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
