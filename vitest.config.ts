import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "next/link": fileURLToPath(new URL("./tests/support/next-link.tsx", import.meta.url)),
      "next/navigation": fileURLToPath(new URL("./tests/support/next-navigation.ts", import.meta.url)),
      "cloudflare:workers": fileURLToPath(new URL("./tests/support/cloudflare-workers.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "happy-dom",
    environmentOptions: { happyDOM: { url: "http://localhost/" } },
  },
});
