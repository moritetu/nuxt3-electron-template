import vuetify from "vite-plugin-vuetify";

export default defineNuxtConfig({
  srcDir: "src/",
  css: ["@/assets/css/main.scss"],
  modules: ["nuxt-electron"],
  build: {
    transpile: ["vuetify"],
  },
  hooks: {
    "vite:extendConfig": (config) => {
      config.plugins!.push(vuetify());
    },
  },
  vite: {
    ssr: {
      noExternal: ["vuetify"],
    },
    define: {
      "process.env.DEBUG": false,
    },
  },
});
