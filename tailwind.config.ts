import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backdropBlur: {
        xs: "4px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "slide-up": "slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scaleIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.8) inset",
        "glass-lg": "0 16px 48px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.8) inset",
        "brand": "0 4px 20px rgba(0,0,0,0.18)",
        "brand-lg": "0 8px 32px rgba(0,0,0,0.22)",
      },
    },
  },
  plugins: [],
};
export default config;
