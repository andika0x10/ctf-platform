import { readFile, readdir } from "node:fs/promises";
import { createHmac, randomBytes } from "node:crypto";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { env } from "cloudflare:workers";
import { createAuth } from "@/lib/auth/factory";
import { readViewer } from "@/lib/auth/viewer";
import type { AuthConfiguration } from "@/lib/auth/config";

export async function testDatabase() {
  const runtime = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("isolated tests"); } }', compatibilityDate: "2026-11-13", d1Databases: { DB: crypto.randomUUID() } }));
  const database = await runtime.getD1Database("DB");
  for (const name of (await readdir(new URL("../../migrations/", import.meta.url))).filter(name => name.endsWith(".sql")).sort()) {
    const sql = await readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8");
    await database.exec(sql.replace(/^--.*$/gm, "").replace(/\n/g, " "));
  }
  const configuration: AuthConfiguration = { secret: randomBytes(48).toString("base64url"), baseURL: "http://localhost:3000", google: { clientId: "test", clientSecret: "test" }, organizerEmails: ["organizer@example.test"] };
  const flagSecret = randomBytes(48).toString("base64url");
  Object.assign(env, { DB: database, APP_ENV: "development", BETTER_AUTH_SECRET: configuration.secret, BETTER_AUTH_URL: configuration.baseURL, GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", ORGANIZER_EMAILS: configuration.organizerEmails.join(","), FLAG_SIGNING_SECRET: flagSecret });
  const auth = createAuth(database, configuration);
  async function identity(organizer = false) {
    const id = crypto.randomUUID(); const email = organizer ? "organizer@example.test" : `${id}@example.test`;
    await database.prepare('INSERT INTO "user" (id,name,email,emailVerified,createdAt,updatedAt,profileComplete,suspended) VALUES (?,?,?,1,?,?,1,0)').bind(id, `Peserta ${id.slice(0, 6)}`, email, Date.now(), Date.now()).run();
    const context = await auth.$context; const session = await context.internalAdapter.createSession(id);
    const signature = createHmac("sha256", configuration.secret).update(session.token).digest("base64");
    const cookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
    const viewer = await readViewer(database, configuration, new Headers({ cookie }));
    if (!viewer) throw new Error("Fixture session missing");
    return { viewer, cookie, token: session.token };
  }
  return { runtime, database, identity, flagSecret, configuration };
}
export function request(path: string, cookie = "", body?: unknown, method = "POST") {
  return new Request(`http://localhost:3000${path}`, { method, headers: { cookie, origin: "http://localhost:3000", "content-type": "application/json" }, ...(method !== "GET" ? { body: JSON.stringify(body) } : {}) });
}
export const context = (id: string) => ({ params: Promise.resolve({ id }) });
export function challengeBody(overrides: Record<string, unknown> = {}) {
  return { title: "A real challenge", category: "web", difficulty: "easy", description: "Find the flag in **this target**.", connectionInfo: "https://example.test", links: [{ name: "source.zip", url: "https://example.test/source.zip" }], hint: "Read the source.", initialPoints: 500, minimumPoints: 100, decay: 50, status: "draft", flag: "CTF{example}", ...overrides };
}
