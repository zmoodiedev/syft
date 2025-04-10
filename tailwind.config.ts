import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '320px',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  important: true,
  plugins: [],
};

export default config; 