// Tailwind v4 through PostCSS, as the Next.js docs set it up. (The @tailwindcss/turbopack
// loader used before cached the compiled CSS: edits to globals.css never reached the dev server.)
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
