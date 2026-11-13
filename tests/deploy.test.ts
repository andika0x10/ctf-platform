// @vitest-environment node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
const valid = { APP_ENV: "production", CLOUDFLARE_D1_DATABASE_ID: "f50185d0-18b4-4eab-8c1e-6c7689b49cda", BETTER_AUTH_URL: "https://ctf.example.test", BETTER_AUTH_SECRET: "a".repeat(48), FLAG_SIGNING_SECRET: "b".repeat(48), GOOGLE_CLIENT_ID: "example-client", GOOGLE_CLIENT_SECRET: "example-private", ORGANIZER_EMAILS: "organizer@example.test" };
function check(overrides: Record<string, string | undefined> = {}) { return spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/deploy.mjs", import.meta.url)), "--check"], { encoding: "utf8", env: { ...process.env, ...valid, ...overrides } }); }
it("validates production settings without uploading or exposing secrets", () => {
  const result = check(); expect(result.status).toBe(0); expect(result.stdout + result.stderr).not.toContain(valid.BETTER_AUTH_SECRET); expect(result.stdout + result.stderr).not.toContain(valid.GOOGLE_CLIENT_SECRET);
  for (const config of [{ APP_ENV: "development" }, { CLOUDFLARE_D1_DATABASE_ID: "3d05ae4a-7641-4bc7-8c46-08edc42f201d" }, { BETTER_AUTH_URL: "http://localhost:5173" }, { BETTER_AUTH_URL: "https://example.test/path" }, { FLAG_SIGNING_SECRET: valid.BETTER_AUTH_SECRET }, { ORGANIZER_EMAILS: "invalid" }]) expect(check(config).status).toBe(1);
});
