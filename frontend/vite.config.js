import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Content-Security-Policy for the built site: the browser refuses any script,
// frame or connection not listed here, so an injected <script> can't run or
// send data elsewhere. Only added to production builds — the dev server's hot
// reload needs inline scripts. Outside sources the site really uses:
//   Razorpay checkout (script, iframe, its API), Google Fonts (index.css),
//   Pexels (landing-page video and poster), Supabase storage (profile photos),
//   Cloudflare Turnstile (sign-in check: script and iframe).
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://checkout.razorpay.com https://*.razorpay.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.pexels.com https://*.supabase.co https://*.razorpay.com",
  "media-src 'self' https://videos.pexels.com",
  "connect-src 'self' https://*.razorpay.com",
  "frame-src https://*.razorpay.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function contentSecurityPolicy() {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: (html) =>
      html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

// https://vite.dev
export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  server: {
    host: "0.0.0.0",
    port: 5173, // Optional: Forces Vite to use this exact port
  },
});
