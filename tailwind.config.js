/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/*.ejs",
          "./views/partials/*.ejs"],
  theme: {
    container: {
      center: true,
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
