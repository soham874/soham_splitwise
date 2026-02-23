import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/login": "http://localhost:8080",
      "/logout": "http://localhost:8080",
      "/callback": "http://localhost:8080",
      "/check_login": "http://localhost:8080",
      "/get_groups": "http://localhost:8080",
      "/get_expenses": "http://localhost:8080",
      "/create_expense": "http://localhost:8080",
      "/delete_expense": "http://localhost:8080",
      "/get_currencies": "http://localhost:8080",
      "/create_trip": "http://localhost:8080",
      "/update_trip": "http://localhost:8080",
      "/get_trips": "http://localhost:8080",
      "/delete_trip": "http://localhost:8080",
      "/get_trip": "http://localhost:8080",
      "/health": "http://localhost:8080",
    },
  },
});
