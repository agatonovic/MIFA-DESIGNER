import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/MIFA-DESIGNER/" : "/",
  plugins: [react(), tailwindcss()],
  server: { port: 3001, strictPort: true },
}));
