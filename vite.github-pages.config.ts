import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/smash-up-card-archive/",
  plugins: [react()],
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});