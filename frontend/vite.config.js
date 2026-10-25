import { defineConfig } from "vite";

// Forward /api calls to the backend so the auth cookie works without CORS.
export default defineConfig({
  server: { proxy: { "/api": "http://localhost:5000" } }
});
