import { defineConfig } from "vite";

export default defineConfig({
  base: "/backend/",
  root: "backend",
  build: {
    outDir: "../dist/backend",
    emptyOutDir: true
  },
  server: {
    host: "0.0.0.0",
    port: 5174
  }
});
