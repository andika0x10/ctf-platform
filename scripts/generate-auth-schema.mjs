import { writeFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { getMigrations } from "better-auth/db/migration";
import { authSchemaOptions } from "../lib/auth/schema.ts";

const runtime = new Miniflare(convertV4MiniflareOptions({
  modules: true,
  script: 'export default { fetch() { return new Response("schema generation"); } }',
  compatibilityDate: "2026-11-13",
  d1Databases: { DB: "schema-generation" },
}));
try {
  const database = await runtime.getD1Database("DB");
  const migrations = await getMigrations({
    ...authSchemaOptions,
    database,
    secret: "schema-generation-only-not-a-runtime-credential",
    baseURL: "http://localhost:5173",
    telemetry: { enabled: false },
  });
  const sql = await migrations.compileMigrations();
  await writeFile(new URL("../migrations/0002_auth.sql", import.meta.url), `-- Generated from Better Auth 1.7.22 and lib/auth/schema.ts.\n${sql}\n`);
  console.log("Generated migrations/0002_auth.sql from the configured Better Auth schema.");
} finally { await runtime.dispose(); }
