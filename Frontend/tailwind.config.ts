import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#183D2B",
          50: "#F1F5F3",
          100: "#E0EBE4",
          200: "#C1D5CA",
          700: "#244D39",
          800: "#183D2B",
          900: "#0F281C",
        },
        moss: {
          DEFAULT: "#687D4D",
          light: "#7F9760",
          dark: "#52633C",
        },
        sage: {
          DEFAULT: "#A8B59A",
          light: "#C0CCB4",
          dark: "#8E9E7F",
        },
        cream: {
          DEFAULT: "#F4F0E6",
          light: "#FCFAF6",
          dark: "#E8E2D4",
          muted: "#DDD6C4",
        },
        earth: {
          DEFAULT: "#B68B63",
          light: "#C79F79",
          dark: "#98704A",
        },
        darktext: "#292722",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Cormorant Garamond", "Georgia", "serif"],
        playfair: ["'Playfair Display'", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        'hero': '32px',
        'editorial': '32px',
        'product': '24px',
        'navbar': '24px',
        'panel': '28px',
        'modal': '28px',
        'cart': '28px',
        'category': '28px',
        'button': '16px',
        'input': '14px',
      },
      boxShadow: {
        'soft': '0 10px 30px -10px rgba(24, 61, 43, 0.08)',
        'elevated': '0 20px 40px -15px rgba(24, 61, 43, 0.12)',
        'glass': '0 8px 32px 0 rgba(24, 61, 43, 0.08)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'sway-slow': 'sway 8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;
