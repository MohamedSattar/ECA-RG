import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/**/*.{ts,tsx}"],
  prefix: "",

    important: true,
  
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))!important",
        input: "hsl(var(--input))!important",
        ring: "hsl(var(--ring))!important",
        background: "hsl(var(--background))!important",
        foreground: "hsl(var(--foreground))!important",
        primary: {
          DEFAULT: "hsl(var(--primary))!important",
          foreground: "hsl(var(--primary-foreground))!important",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))!important",
          foreground: "hsl(var(--secondary-foreground))!important",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))!important",
          foreground: "hsl(var(--destructive-foreground))!important",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))!important",
          foreground: "hsl(var(--muted-foreground))!important",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))!important",
          foreground: "hsl(var(--accent-foreground))!important",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))!important",
          foreground: "hsl(var(--popover-foreground))!important",
        },
        card: {
          DEFAULT: "hsl(var(--card))!important",
          foreground: "hsl(var(--card-foreground))!important",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))!important",
          foreground: "hsl(var(--sidebar-foreground))!important",
          primary: "hsl(var(--sidebar-primary))!important",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))!important",
          accent: "hsl(var(--sidebar-accent))!important",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))!important",
          border: "hsl(var(--sidebar-border))!important",
          ring: "hsl(var(--sidebar-ring))!important",
        },
      },
      borderRadius: {
        lg: "var(--radius)!important",
        md: "calc(var(--radius) - 2px)!important",
        sm: "calc(var(--radius) - 4px)!important",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)!important",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)!important",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
