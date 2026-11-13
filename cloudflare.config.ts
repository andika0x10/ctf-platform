import { bindings, defineConfig, defineWorker, exports } from "cf/config";
import * as entrypoint from "./worker.ts" with { type: "cf-worker" };

// Keep the export definition separate so the namespace binding can infer its RPC type.
const application = defineWorker({
  name: "ctf-platform",
  entrypoint,
  compatibilityDate: "2026-11-13",
  compatibilityFlags: ["nodejs_compat"],
  exports: {
    ParticipantCoordinator: exports.durableObject({ storage: "sqlite" }),
  },
});

export default defineConfig({
  worker: defineWorker({
    ...application,
    observability: {
      enabled: true,
      redactQueryString: true,
      logs: { enabled: true },
      traces: { enabled: true, headSamplingRate: 0.1 },
    },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({
        name: "ctf-platform-db",
        // This UUID identifies only the local simulation. Set a real ID before deployment.
        id: process.env.CLOUDFLARE_D1_DATABASE_ID || "3d05ae4a-7641-4bc7-8c46-08edc42f201d",
      }),
      PARTICIPANT_COORDINATOR: bindings.durableObject({
        worker: application,
        exportName: "ParticipantCoordinator",
      }),
      APP_ENV: bindings.text(process.env.APP_ENV || "development"),
    },
  }),
});
