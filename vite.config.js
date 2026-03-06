import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Interview Prep Tracker",
        short_name: "Tracker",
        description: "Daily interview preparation planner with sync",
        start_url: "/",
        display: "standalone",
        background_color: "#FAF8F5",
        theme_color: "#3D3529",
        icons: [
          { src: "/tracker_logo.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ],
});
