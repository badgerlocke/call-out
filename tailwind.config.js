/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs"],
  theme: {
    container: {
      center: true,
    },
    // Restrained scale: crisp corners, no bubbles. Roughly editor-chrome sized.
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      DEFAULT: '0.25rem',
      md: '0.25rem',
      lg: '0.375rem',
      xl: '0.5rem',
      '2xl': '0.5rem',
      '3xl': '0.625rem',
      full: '0.625rem',
    },
    extend: {
      backgroundImage: {
        'bridge-lg': "url('../bkg/vertical/bridge-lg.png')",
        'bridge-md': "url('../bkg/vertical/bridge-md.png')",
        'bridge-sm': "url('../bkg/vertical/bridge-sm.png')"
      }
    },
  },
  plugins: [require('@tailwindcss/typography'),require("daisyui")],

  // daisyUI config (optional)
  daisyui: {
    // Both themes share the tightened radii; "forest" is the dark counterpart to "light".
    themes: ["light", "forest"].map(name => ({
      [name]: {
        ...require("daisyui/src/theming/themes")[name],
        // daisyUI's light theme ships a purple primary, so match the logo green.
        ...(name === "light" && { primary: "#157f4f", "primary-content": "#ffffff" }),
        "--rounded-box": "0.5rem",
        "--rounded-btn": "0.25rem",
        "--rounded-badge": "0.25rem",
        "--tab-radius": "0.25rem",
        "--btn-focus-scale": "1",
      },
    })),
    darkTheme: "forest",
  },
}
