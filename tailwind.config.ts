import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        atharx: {
          navy: "#0B1D3A",
          navy2: "#0F2A52",
          teal: "#00C2A8",
          teal2: "#00E0B8",
          gold: "#F2B705",
          ink: "#081324",
          cloud: "#F5F8FB",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 30px rgba(11, 29, 58, 0.08)",
        glow: "0 0 40px rgba(0, 194, 168, 0.35)",
      },
      backgroundImage: {
        "atharx-hero":
          "radial-gradient(circle at 20% 20%, rgba(0,194,168,0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(242,183,5,0.18), transparent 40%), linear-gradient(160deg, #071229 0%, #0B1D3A 45%, #0F2A52 100%)",
      },
      keyframes: {
        "coin-pop": {
          "0%": { transform: "scale(0.4) rotate(-15deg)", opacity: "0" },
          "60%": { transform: "scale(1.15) rotate(8deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "coin-pop": "coin-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
