/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'sourdough': '#f4ebd8',
        'sunrise': '#fcecb4',
        'denim': '#6b8caf',
        'earlgrey': '#2b2b2b',
      },
      fontFamily: {
        'typewriter': ['"Courier New"', 'Courier', 'monospace'],
        'book': ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
}
