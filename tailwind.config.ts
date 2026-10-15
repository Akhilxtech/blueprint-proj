import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Department Pink Palette
        'pink-bg': '#F7F2F5',
        'pink-bg-secondary': '#F1E9EF',
        'pink-text': '#302630',
        'pink-text-secondary': '#4E404C',
        'pink-primary': '#D9468D',
        'pink-deep': '#BE3477',
        'pink-accent': '#FCE7F1',
        'pink-glass': 'rgba(255, 255, 255, 0.58)',
        'pink-glass-border': 'rgba(255, 255, 255, 0.72)',
        'pink-border': '#E7DCE4',
      },
      backgroundImage: {
        'glass-card': "rgba(255, 255, 255, 0.58)",
      },
      boxShadow: {
        'glass': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'glass-lg': '0 10px 30px rgba(78, 40, 62, 0.055)',
      },
      backdropBlur: {
        'glass': '8px',
        'glass-lg': '12px',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config;