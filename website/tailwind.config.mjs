/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a2e',
        'ink-light': '#2d2d4a',
        paper: '#faf8f5',
        'paper-dark': '#e8e4dd',
        accent: '#c9a96e',
        'accent-light': '#e0c78a',
        muted: '#7a7a8a',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif CN"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
