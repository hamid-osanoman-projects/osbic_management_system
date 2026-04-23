/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--foreground)",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        gold: "#D4AF37",
        navy: {
          900: "var(--background)",
          800: "var(--card)",
          700: "var(--sidebar)",
        },
      },
      borderRadius: {
        lg: "16px",
        md: "10px",
        sm: "6px",
        xl: "24px",
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      spacing: {
        base: "4px",
      },
    },
  },
  plugins: [],
}
