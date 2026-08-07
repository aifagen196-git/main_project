import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173, // Optional: Forces Vite to use this exact port
  },
});
