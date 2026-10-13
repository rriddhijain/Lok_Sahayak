/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          bg: "#f8fafc",        // ultra-clean slate 50
          card: "#ffffff",      // crisp clinical white
          border: "#e2e8f0",    // slate 200
          borderLight: "#f1f5f9",
          slate: {
            50: "#f8fafc",
            100: "#f1f5f9",
            200: "#e2e8f0",
            300: "#cbd5e1",
            400: "#94a3b8",
            500: "#64748b",
            600: "#475569",
            700: "#334155",
            800: "#1e293b",
            900: "#0f172a",
            950: "#020617",
          },
        },
        // Semantic Medical Status System
        status: {
          optimal: {
            DEFAULT: "#059669", // Emerald Green
            light: "#ecfdf5",
            border: "#a7f3d0",
            text: "#065f46",
          },
          warning: {
            DEFAULT: "#d97706", // Amber / Orange
            light: "#fffbeb",
            border: "#fde68a",
            text: "#92400e",
          },
          emergency: {
            DEFAULT: "#dc2626", // Crimson Red
            light: "#fef2f2",
            border: "#fecaca",
            text: "#991b1b",
          },
          info: {
            DEFAULT: "#0284c7", // Medical Cyan / Sky
            light: "#f0f9ff",
            border: "#bae6fd",
            text: "#0369a1",
          },
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)",
        card: "0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 2px 4px -2px rgba(15, 23, 42, 0.03)",
        elevated: "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)",
        emergencyGlow: "0 0 20px rgba(220, 38, 38, 0.2)",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(1.2)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        "pulse-dot": "pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slideInRight 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
