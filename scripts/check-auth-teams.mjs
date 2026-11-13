import assert from "node:assert/strict";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = parseEnv(readFileSync(new URL("../.dev.vars", import.meta.url), "utf8"));
const origin = process.env.CHECK_ORIGIN || config.BETTER_AUTH_URL;
const parsed = new URL(origin);
assert.ok(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname), "This check is restricted to a local HTTP development/preview server.");
assert.ok(config.BETTER_AUTH_SECRET?.length >= 32, "Run npm run auth:setup first.");
const fixtureFile = fileURLToPath(new URL(`../.cloudflare/auth-smoke-${randomUUID()}.json`, import.meta.url));
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || "3d05ae4a-7641-4bc7-8c46-08edc42f201d";
const people = [0, 1].map(() => ({ id: randomUUID(), sessionId: randomUUID(), token: randomBytes(32).toString("hex"), email: `ctf-smoke-${randomUUID()}@example.invalid` }));
function sql(batch) {
  // cf's generated raw-query API accepts string parameters; SQLite applies column affinity.
  writeFileSync(fixtureFile, JSON.stringify(batch.map((statement) => ({ ...statement, params: statement.params.map(String) }))));
  execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/cf/bin/cf", import.meta.url)), "d1", "raw", databaseId, "--local", "--batch", `@${fixtureFile}`], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
}
function cookie(person) {
  const signature = createHmac("sha256", config.BETTER_AUTH_SECRET.trim()).update(person.token).digest("base64");
  return `ctf.session_token=${encodeURIComponent(`${person.token}.${signature}`)}`;
}
function call(path, { person, body, method = "GET", redirect = "manual" } = {}) {
  return fetch(origin + path, {
    method, redirect,
    headers: { origin, "cf-connecting-ip": "127.0.0.1", ...(person ? { cookie: cookie(person) } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
}
const [owner, member] = people;
try {
  const before = Date.now();
  sql(people.flatMap((person) => [
    { sql: 'INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt, profileComplete, suspended) VALUES (?, ?, ?, 1, ?, ?, 0, 0)', params: [person.id, "Peserta", person.email, before, before] },
    { sql: 'INSERT INTO "session" (id, token, userId, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', params: [person.sessionId, person.token, person.id, before + 3600000, before, before] },
  ]));
  for (const path of ["/team", "/account", "/admin", "/admin/teams", "/challenges"]) {
    const response = await call(path);
    assert.ok([303, 307].includes(response.status), `${path} must redirect guests`);
    assert.ok(response.headers.get("location")?.includes("/login?next="));
  }
  assert.equal((await call("/api/teams", { method: "POST", body: { name: "Guest" } })).status, 401);
  const onboarding = await call("/account", { person: owner });
  assert.equal(onboarding.status, 200);
  assert.match(onboarding.headers.get("cache-control") || "", /no-store|private|no-cache/, "Authenticated HTML must not be publicly cached");
  assert.ok((await onboarding.text()).includes("Kenalkan nama tampilanmu."));
  assert.equal((await call("/team", { person: owner })).status, 307);
  for (const [index, person] of people.entries()) {
    const response = await call("/api/profile", { person, method: "PATCH", body: { name: `Smoke Peserta ${index}` } });
    assert.equal(response.status, 200);
  }
  const teamName = `Smoke ${randomUUID().slice(0, 8)}`;
  const creation = await call("/api/teams", { person: owner, method: "POST", body: { name: teamName } });
  assert.equal(creation.status, 201);
  const { id } = await creation.json();
  const details = await (await call(`/api/teams/${id}`, { person: owner })).json();
  assert.ok(details.team.inviteCode);
  const workspace = await call("/team", { person: owner });
  assert.equal(workspace.status, 200);
  const html = await workspace.text();
  assert.ok(html.includes(teamName));
  assert.ok(html.includes("Akun saya"));
  const admin = await call("/admin/teams", { person: owner });
  assert.equal(admin.status, 307);
  assert.ok(admin.headers.get("location")?.includes("organizer-only"));
  assert.equal((await call("/api/teams/join", { person: member, method: "POST", body: { code: details.team.inviteCode } })).status, 200);
  const memberDetails = await (await call(`/api/teams/${id}`, { person: member })).json();
  assert.equal(memberDetails.team.members.length, 2);
  assert.equal(memberDetails.team.inviteCode, undefined);
  assert.equal((await call(`/api/teams/${id}`, { person: member, method: "PATCH", body: { action: "rename", name: "Denied" } })).status, 403);
  assert.equal((await call(`/api/teams/${id}`, { person: owner, method: "PATCH", body: { action: "leave" } })).status, 200);
  assert.equal((await call(`/api/teams/${id}`, { person: owner })).status, 404);
  assert.equal((await call(`/api/teams/${id}`, { person: member, method: "PATCH", body: { action: "leave" } })).status, 200);
  assert.equal((await call("/api/teams", { person: member }).then((response) => response.json())).team, null);
  assert.equal((await call("/api/auth/sign-out", { person: member, method: "POST", body: {} })).status, 200);
  assert.equal((await call("/account", { person: member })).status, 307);
  const signIn = await call("/api/auth/sign-in/social", { method: "POST", body: { provider: "google", callbackURL: origin + "/account?welcome=1", disableRedirect: true } });
  assert.equal(signIn.status, 200, "Google OAuth settings must be configured for this runtime check");
  const provider = new URL((await signIn.json()).url);
  assert.equal(provider.hostname, "accounts.google.com");
  assert.equal(provider.searchParams.get("redirect_uri"), config.BETTER_AUTH_URL.replace(/\/$/, "") + "/api/auth/callback/google");
  assert.ok(provider.searchParams.get("state"));
  assert.equal((await call("/api/auth/sign-in/social", { method: "POST", body: { provider: "google", callbackURL: "https://evil.test" } })).status, 403);
  console.log("Runtime verified: authenticated SSR, onboarding, participant/admin guards, create/join, private invite codes, automatic ownership transfer, leave, cascade delete, sign-out, and Google OAuth initiation.");
  console.log("Google account consent and callback completion require a real browser sign-in; this script does not bypass Google in the application.");
} finally {
  const ids = people.map((person) => person.id);
  const cleanup = [
    { sql: "DELETE FROM teams WHERE owner_user_id IN (?, ?)", params: ids },
  ];
  for (const person of people) cleanup.push(
    { sql: 'DELETE FROM "session" WHERE userId = ?', params: [person.id] },
    { sql: 'DELETE FROM "user" WHERE id = ? AND email = ?', params: [person.id, person.email] },
  );
  try { sql(cleanup); }
  finally { try { unlinkSync(fixtureFile); } catch { /* May not have been created. */ } }
}
