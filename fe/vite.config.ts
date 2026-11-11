import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (_proxyReq, req) => {
            console.log(`\x1b[35m[FE -> BE]\x1b[0m ${req.method} ${req.url}`);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            const status = proxyRes.statusCode || 200;
            const color = status >= 400 ? "\x1b[31m" : "\x1b[32m";
            console.log(`\x1b[35m[FE <- BE]\x1b[0m ${color}${status}\x1b[0m ${req.method} ${req.url}`);
          });
          proxy.on("error", (err, req) => {
            console.error(`\x1b[31m[FE Proxy Error]\x1b[0m ${req.method} ${req.url}:`, err.message);
          });
        },
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
  },
});
