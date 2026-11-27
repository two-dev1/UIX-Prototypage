import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  build: {
    target: "es2022",
    cssMinify: true,
  },
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "OUTRS — Que faire à Paris",
        short_name: "OUTRS",
        description: "Les sorties culturelles à Paris, la communauté Outers et tes billets.",
        lang: "fr",
        theme_color: "#151515",
        background_color: "#191919",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/opendata\.paris\.fr\/api\//,
            handler: "NetworkFirst",
            options: { cacheName: "opendata", networkTimeoutSeconds: 6, expiration: { maxEntries: 60, maxAgeSeconds: 86_400 } },
          },
          {
            urlPattern: /^https:\/\/(images\.unsplash\.com|cdn\.paris\.fr)\//,
            handler: "CacheFirst",
            options: { cacheName: "images", expiration: { maxEntries: 150, maxAgeSeconds: 604_800 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "CacheFirst",
            options: { cacheName: "fonts", expiration: { maxEntries: 20, maxAgeSeconds: 31_536_000 } },
          },
        ],
      },
    }),
  ],
});
