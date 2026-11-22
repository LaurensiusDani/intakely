module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: { cream: "#FFF9F0", forest: { DEFAULT: "#176B50", deep: "#0F4D39", soft: "#E6F4EE" } },
    },
  },
};
