const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-preset-env": {
      stage: 0, // Enable all experimental features for maximum compatibility
      features: {
        "nesting-rules": true,
        "cascade-layers": true, // Polyfill @layer
        "oklch-function": true, // Polyfill oklch colors
        "color-function": true,
        "logical-properties-and-values": true,
        "custom-properties": false, // Tailwind handles variables, but we might need this if TW fails
        "gap-properties": true,
      },
      autoprefixer: {
        grid: "autoplace",
      },
    },
  },
};

export default config;
