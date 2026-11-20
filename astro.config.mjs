// @ts-check
import { defineConfig } from "astro/config";

// Static site served by GitHub Pages on the custom domain (no base path).
export default defineConfig({
  site: "https://www.elhamkouhbor.com",
  output: "static",
  trailingSlash: "ignore",
  build: { inlineStylesheets: "auto", assets: "_assets" },
  image: { layout: "constrained", responsiveStyles: true },
  devToolbar: { enabled: false },
  server: { port: 4321 },
});
