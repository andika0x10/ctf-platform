import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      persistState: { path: ".cloudflare/state" },
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
    {
      name: "stable-rsc-auth-dependencies",
      enforce: "post",
      // On-demand optimization can invalidate modules while the Cloudflare runner
      // imports Better Auth. Keep vinext's explicit includes; load other ESM as-is.
      config: () => ({ environments: { rsc: { optimizeDeps: { noDiscovery: true } } } }),
    },
  ],
});
