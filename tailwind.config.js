/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/*.ejs",
          "./views/partials/*.ejs"],
  theme: {
    extend: {
      backgroundImage: {
        'thisdoesntwork': "url('./public/bkg/pexels-jacob-colvin-1761279.jpg')"
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
