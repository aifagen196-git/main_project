import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Separate app from frontend/ on purpose — a distinct admin surface with its
// own login, deployed independently (e.g. admin.aifagenlabs.com) so a bug or
// compromise in the public site's build doesn't reach the posting tool, and
// vice versa.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5174,
  },
});
