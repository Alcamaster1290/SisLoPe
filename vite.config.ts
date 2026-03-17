import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      child_process: path.resolve(__dirname, "src/lib/browserChildProcess.ts"),
      "node:child_process": path.resolve(__dirname, "src/lib/browserChildProcess.ts"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          map: ["maplibre-gl", "@deck.gl/core", "@deck.gl/layers", "@deck.gl/mapbox", "deck.gl"],
          geo: ["@turf/turf", "d3"],
          motion: ["framer-motion"],
          three: ["three"],
        },
      },
    },
  },
});
