/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/*.ejs",
          "./views/partials/*.ejs"],
  theme: {
    extend: {
      backgroundImage: {
        'bridge-lg': "url('../bkg/bridge-lg.png')",
        'bridge-md': "url('../bkg/bridge-md.png')",
        'bridge-sm': "url('../bkg/bridge-sm.png')"
      }
    },
  },
  plugins: [require('@tailwindcss/typography'),require("daisyui")],

  // daisyUI config (optional)
  daisyui: {
    styled: true,
    themes: ["light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee", "winter"],
    base: true,
    utils: true,
    logs: true,
    rtl: false,
    prefix: "",
    darkTheme: "dark",
  },
}
