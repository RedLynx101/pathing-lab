import { defineConfig } from "vite";

// Relative base so the production build works from any subpath,
// including GitHub Pages (https://redlynx101.github.io/pathing-lab/).
export default defineConfig({
  base: "./",
});
