/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');
// Single source of the palette and fonts, shared with the MUI theme (src/theme/index.js).
const tokens = require('./src/theme/tokens.json');

/** '#9fd1a6' -> '159 209 166', so Tailwind can add opacity (bg-brand/50). */
const toChannels = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
};

const cssVars = (scheme) =>
  Object.fromEntries(Object.entries(scheme).map(([name, hex]) => [`--color-${name}`, toChannels(hex)]));

module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // bg-brand, text-ink, border-line... each reads a CSS variable set below, so a
      // colour scheme only has to redefine the variables.
      colors: Object.fromEntries(
        Object.keys(tokens.light).map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`])
      ),
      fontFamily: {
        sans: tokens.fonts.sans,
        display: tokens.fonts.display,
      },
    },
    screens: {
      'sm': '640px',
      // => @media (min-width: 640px) { ... }

      'md': '768px',
      // => @media (min-width: 768px) { ... }

      'lg': '1024px',
      // => @media (min-width: 1024px) { ... }

      'xl': '1280px',
      // => @media (min-width: 1280px) { ... }

      '2xl': '1536px',
      // => @media (min-width: 1536px) { ... }
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': cssVars(tokens.light) });
      // A "dark" scheme added to tokens.json is applied under <html class="dark">.
      if (tokens.dark) addBase({ '.dark': cssVars(tokens.dark) });
      // "Paper" elements (torn-paper bands, rating badges) are drawn with fixed light
      // artwork, so they keep the light scheme inside dark mode.
      addBase({ '.dark .paper-band, .dark .voto, .dark .media': cssVars(tokens.light) });
    }),
  ],
}
