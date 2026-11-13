// @vitest-environment node
import { readFile } from "node:fs/promises";
import { createHmac, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { env } from "cloudflare:workers";
import { createAuth } from "@/lib/auth/factory";
import { getAuthConfiguration, safeReturnPath, type AuthConfiguration } from "@/lib/auth/config";
import { readViewer, resolveRole, type Viewer } from "@/lib/auth/viewer";
import { createTeam, getCurrentTeam, getTeamDetails, joinTeam, updateTeam } from "@/lib/teams";
import { PATCH as updateProfile } from "@/app/api/profile/route";
import { POST as createTeamRoute } from "@/app/api/teams/route";
import { POST as joinTeamRoute } from "@/app/api/teams/join/route";
import { PATCH as teamActionRoute, GET as teamDetailsRoute } from "@/app/api/teams/[id]/route";

const configuration: AuthConfiguration = {
  secret: randomBytes(48).toString("base64url"),
  baseURL: "http://localhost:3000",
  google: { clientId: "test-client", clientSecret: "test-client-secret" },
  organizerEmails: ["organizer@example.test"],
};
let runtime: Miniflare;
let database: D1Database;
let auth: ReturnType<typeof createAuth>;

beforeAll(async () => {
  runtime = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("isolated integration database"); } }',
    compatibilityDate: "2026-11-13",
    d1Databases: { DB: "auth-team-integration-tests" },
  }));
  database = await runtime.getD1Database("DB");
  // D1's exec supports a sequence of one-line statements. Keep trigger bodies intact.
  for (const name of ["0001_foundation.sql", "0002_auth.sql", "0003_teams.sql"]) {
    const sql = await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");
    await database.exec(sql.replace(/^--.*$/gm, "").replace(/\n/g, " "));
  }
  Object.assign(env, {
    DB: database, APP_ENV: "development", BETTER_AUTH_SECRET: configuration.secret,
    BETTER_AUTH_URL: configuration.baseURL, GOOGLE_CLIENT_ID: configuration.google.clientId,
    GOOGLE_CLIENT_SECRET: configuration.google.clientSecret, ORGANIZER_EMAILS: configuration.organizerEmails.join(","),
  });
  auth = createAuth(database, configuration);
}, 30000);
afterAll(async () => { await runtime?.dispose(); });

async function identity(email = `${crypto.randomUUID()}@example.test`, complete = true) {
  const context = await auth.$context;
  // Seed a verified identity ONLY in this isolated test database. No application login bypass exists.
  const user = { id: crypto.randomUUID() };
  await database.prepare('INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt, profileComplete, suspended) VALUES (?, ?, ?, 1, ?, ?, ?, 0)')
    .bind(user.id, complete ? `Peserta ${user.id.slice(0, 6)}` : "Peserta", email, Date.now(), Date.now(), complete ? 1 : 0).run();
  const session = await context.internalAdapter.createSession(user.id);
  const signature = createHmac("sha256", configuration.secret).update(session.token).digest("base64");
  const cookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
  const headers = new Headers({ cookie });
  const viewer = await readViewer(database, configuration, headers);
  expect(viewer).not.toBeNull();
  return { viewer: viewer!, cookie, headers, token: session.token };
}
function request(path: string, cookie: string, body?: unknown, method = "POST", origin = configuration.baseURL) {
  return new Request(`${configuration.baseURL}${path}`, {
    method,
    headers: { cookie, origin, "content-type": "application/json" },
    ...(method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });
}
function context(id: string) { return { params: Promise.resolve({ id }) }; }

describe("authentication and server authorization", () => {
  it("validates runtime configuration and limits insecure HTTP to local development", () => {
    expect(getAuthConfiguration(env)?.baseURL).toBe(configuration.baseURL);
    expect(getAuthConfiguration({ ...env, BETTER_AUTH_SECRET: "short" })).toBeNull();
    expect(getAuthConfiguration({ ...env, APP_ENV: "production" })).toBeNull();
    expect(getAuthConfiguration({ ...env, BETTER_AUTH_URL: "http://example.com" })).toBeNull();
  });
  it("accepts only internal return destinations and resolves roles from verified email", () => {
    for (const value of ["//evil.test", "https://evil.test", "/\\evil.test", "/api/auth/sign-out", "/login", "/account?welcome=1"]) expect(safeReturnPath(value)).toBeNull();
    expect(safeReturnPath("/challenges?category=web")).toBe("/challenges?category=web");
    expect(resolveRole("ORGANIZER@example.test", true, configuration.organizerEmails)).toBe("organizer");
    expect(resolveRole("organizer@example.test", false, configuration.organizerEmails)).toBe("participant");
    expect(resolveRole("other@example.test", true, configuration.organizerEmails)).toBe("participant");
  });
  it("uses real Better Auth sessions and forces display-name onboarding", async () => {
    const person = await identity(undefined, false);
    expect(person.viewer.name).toBe("Peserta");
    expect(person.viewer.profileComplete).toBe(false);
    expect(await readViewer(database, configuration, new Headers({ cookie: "ctf.session_token=forged.invalid" }))).toBeNull();
    expect((await createTeamRoute(request("/api/teams", person.cookie, { name: "Blocked onboarding" }))).status).toBe(403);
    const response = await updateProfile(request("/api/profile", person.cookie, { name: "Nama Pilihan" }, "PATCH"));
    expect(response.status).toBe(200);
    const current = await readViewer(database, configuration, person.headers);
    expect(current?.name).toBe("Nama Pilihan");
    expect(current?.profileComplete).toBe(true);
  });
  it("rejects unauthenticated requests, cross-origin writes, and client-controlled authorization fields", async () => {
    const person = await identity();
    expect((await createTeamRoute(request("/api/teams", "", { name: "No session" }))).status).toBe(401);
    expect((await updateProfile(request("/api/profile", person.cookie, { name: "Valid Name" }, "PATCH", "https://evil.test"))).status).toBe(403);
    expect((await updateProfile(request("/api/profile", person.cookie, { name: "Valid Name", role: "organizer", profileComplete: true }, "PATCH"))).status).toBe(400);
    const raw = await auth.handler(request("/api/auth/update-user", person.cookie, { name: "Bypass", role: "organizer" }));
    expect(raw.status).toBe(404);
  });
  it("revokes access immediately for suspended users and invalidated sessions", async () => {
    const person = await identity();
    await database.prepare('UPDATE "user" SET suspended = 1 WHERE id = ?').bind(person.viewer.id).run();
    expect(await readViewer(database, configuration, person.headers)).toBeNull();
    await database.prepare('UPDATE "user" SET suspended = 0 WHERE id = ?').bind(person.viewer.id).run();
    await database.prepare('DELETE FROM "session" WHERE token = ?').bind(person.token).run();
    expect(await readViewer(database, configuration, person.headers)).toBeNull();
  });
  it("rejects expired sessions", async () => {
    const person = await identity();
    await database.prepare('UPDATE "session" SET expiresAt = ? WHERE token = ?').bind(Date.now() - 60000, person.token).run();
    expect(await readViewer(database, configuration, person.headers)).toBeNull();
  });
  it("initiates Google OAuth with state and refuses an external callback destination", async () => {
    const result = await auth.handler(request("/api/auth/sign-in/social", "", { provider: "google", callbackURL: "/account?welcome=1", disableRedirect: true }));
    expect(result.status).toBe(200);
    const data = await result.json() as { url: string };
    const url = new URL(data.url);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(result.headers.get("set-cookie")).toContain("HttpOnly");
    const rejected = await auth.handler(request("/api/auth/sign-in/social", "", { provider: "google", callbackURL: "https://evil.test" }));
    expect(rejected.status).toBe(403);
  });
  it("sign-out invalidates the server session", async () => {
    const person = await identity();
    const response = await auth.handler(request("/api/auth/sign-out", person.cookie, {}));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await readViewer(database, configuration, person.headers)).toBeNull();
  });
});

describe("team membership and ownership on D1", () => {
  it("creates teams, joins through a code, and keeps invitation codes private", async () => {
    const owner = await identity(); const member = await identity(); const outsider = await identity();
    const response = await createTeamRoute(request("/api/teams", owner.cookie, { name: `Team ${crypto.randomUUID().slice(0, 8)}` }));
    expect(response.status).toBe(201);
    const { id } = await response.json() as { id: string };
    const details = await getTeamDetails(database, id, owner.viewer);
    expect(details?.members.length).toBe(1);
    expect((await joinTeamRoute(request("/api/teams/join", member.cookie, { code: details!.inviteCode }))).status).toBe(200);
    const memberResponse = await teamDetailsRoute(request(`/api/teams/${id}`, member.cookie, undefined, "GET"), context(id));
    const memberData = await memberResponse.json() as { team: Record<string, unknown> };
    expect(memberData.team).not.toHaveProperty("inviteCode");
    expect(JSON.stringify(memberData)).not.toContain(owner.viewer.email);
    expect((await teamDetailsRoute(request(`/api/teams/${id}`, outsider.cookie, undefined, "GET"), context(id))).status).toBe(404);
    expect((await teamActionRoute(request(`/api/teams/${id}`, member.cookie, { action: "rename", name: "Not authorized" }, "PATCH"), context(id))).status).toBe(403);
  });
  it("allows exactly one membership under concurrent join and create requests", async () => {
    const first = await identity(); const second = await identity(); const joining = await identity();
    const a = await createTeam(database, first.viewer, `Race A ${crypto.randomUUID().slice(0, 6)}`);
    const b = await createTeam(database, second.viewer, `Race B ${crypto.randomUUID().slice(0, 6)}`);
    const codeA = (await getTeamDetails(database, a, first.viewer))!.inviteCode;
    const codeB = (await getTeamDetails(database, b, second.viewer))!.inviteCode;
    const results = await Promise.allSettled([
      joinTeam(database, joining.viewer, codeA), joinTeam(database, joining.viewer, codeB),
      createTeam(database, joining.viewer, `Race C ${crypto.randomUUID().slice(0, 6)}`),
    ]);
    expect(results.filter((result) => result.status === "fulfilled").length).toBe(1);
    expect((await database.prepare("SELECT COUNT(*) AS total FROM team_members WHERE user_id = ?").bind(joining.viewer.id).first<{ total: number }>())?.total).toBe(1);
    const dangling = await database.prepare("SELECT COUNT(*) AS total FROM teams t WHERE t.status = 'active' AND NOT EXISTS (SELECT 1 FROM team_members m WHERE m.team_id = t.id AND m.user_id = t.owner_user_id)").first<{ total: number }>();
    expect(dangling?.total).toBe(0);
  });
  it("normalizes team names and rolls back a duplicate-name creation", async () => {
    const first = await identity(); const second = await identity();
    const name = `Unique ${crypto.randomUUID().slice(0, 8)}`;
    await createTeam(database, first.viewer, name);
    await expect(createTeam(database, second.viewer, `  ${name.toUpperCase()}  `)).rejects.toMatchObject({ status: 409 });
    expect(await getCurrentTeam(database, second.viewer)).toBeNull();
  });
  it("rotates invitation codes and rejects the previous code", async () => {
    const owner = await identity(); const joining = await identity();
    const id = await createTeam(database, owner.viewer, `Codes ${crypto.randomUUID().slice(0, 8)}`);
    const before = (await getTeamDetails(database, id, owner.viewer))!.inviteCode;
    await updateTeam(database, owner.viewer, id, { action: "rotate-invite" });
    const after = (await getTeamDetails(database, id, owner.viewer))!.inviteCode;
    expect(after).not.toBe(before);
    await expect(joinTeam(database, joining.viewer, before)).rejects.toMatchObject({ status: 404 });
    await joinTeam(database, joining.viewer, after);
  });
  it("requires transfer before the owner leaves and preserves team events when a member moves", async () => {
    const owner = await identity(); const member = await identity();
    const id = await createTeam(database, owner.viewer, `Transfer ${crypto.randomUUID().slice(0, 6)}`);
    await joinTeam(database, member.viewer, (await getTeamDetails(database, id, owner.viewer))!.inviteCode);
    await expect(updateTeam(database, owner.viewer, id, { action: "leave" })).rejects.toMatchObject({ status: 409 });
    await expect(updateTeam(database, owner.viewer, id, { action: "archive" })).rejects.toMatchObject({ status: 409 });
    await updateTeam(database, owner.viewer, id, { action: "transfer-owner", userId: member.viewer.id });
    await expect(updateTeam(database, owner.viewer, id, { action: "rename", name: "Former owner" })).rejects.toMatchObject({ status: 403 });
    await updateTeam(database, owner.viewer, id, { action: "leave" });
    await createTeam(database, owner.viewer, `New Home ${crypto.randomUUID().slice(0, 6)}`);
    const original = await getTeamDetails(database, id, member.viewer);
    expect(original?.ownerUserId).toBe(member.viewer.id);
    expect(original?.events.some((event) => event.kind === "created")).toBe(true);
    expect(original?.events.some((event) => event.kind === "left")).toBe(true);
    expect(original?.members.length).toBe(1);
  });
  it("allows the owner to remove a member, but protects the current owner", async () => {
    const owner = await identity(); const member = await identity();
    const id = await createTeam(database, owner.viewer, `Remove ${crypto.randomUUID().slice(0, 6)}`);
    await joinTeam(database, member.viewer, (await getTeamDetails(database, id, owner.viewer))!.inviteCode);
    await expect(updateTeam(database, owner.viewer, id, { action: "remove-member", userId: owner.viewer.id })).rejects.toMatchObject({ status: 409 });
    await updateTeam(database, owner.viewer, id, { action: "remove-member", userId: member.viewer.id });
    expect(await getCurrentTeam(database, member.viewer)).toBeNull();
  });
  it("supports more than five members and lets a sole owner archive a team", async () => {
    const owner = await identity();
    const id = await createTeam(database, owner.viewer, `Unlimited ${crypto.randomUUID().slice(0, 6)}`);
    const code = (await getTeamDetails(database, id, owner.viewer))!.inviteCode;
    for (let index = 0; index < 7; index++) {
      const member = await identity();
      await joinTeam(database, member.viewer, code);
    }
    expect((await getTeamDetails(database, id, owner.viewer))?.members.length).toBe(8);

    const solo = await identity();
    const soloId = await createTeam(database, solo.viewer, `Solo ${crypto.randomUUID().slice(0, 6)}`);
    await updateTeam(database, solo.viewer, soloId, { action: "archive" });
    expect(await getCurrentTeam(database, solo.viewer)).toBeNull();
    const record = await database.prepare("SELECT status FROM teams WHERE id = ?").bind(soloId).first<{ status: string }>();
    expect(record?.status).toBe("archived");
  });
  it("lets organizers help teams and archives without deleting their history", async () => {
    const organizer = await identity("organizer@example.test"); const owner = await identity(); const member = await identity();
    expect(organizer.viewer.role).toBe("organizer");
    const id = await createTeam(database, owner.viewer, `Archive ${crypto.randomUUID().slice(0, 6)}`);
    const code = (await getTeamDetails(database, id, owner.viewer))!.inviteCode;
    await joinTeam(database, member.viewer, code);
    await updateTeam(database, organizer.viewer, id, { action: "rename", name: `Helped ${crypto.randomUUID().slice(0, 6)}` });
    await updateTeam(database, organizer.viewer, id, { action: "archive" });
    const archived = await getTeamDetails(database, id, organizer.viewer);
    expect(archived?.status).toBe("archived");
    expect(archived?.members.length).toBe(0);
    expect(archived?.events.some((event) => event.kind === "created")).toBe(true);
    expect(archived?.events.some((event) => event.kind === "archived")).toBe(true);
    expect(await getCurrentTeam(database, owner.viewer)).toBeNull();
    await expect(joinTeam(database, member.viewer, code)).rejects.toMatchObject({ status: 404 });
    await createTeam(database, owner.viewer, `After archive ${crypto.randomUUID().slice(0, 6)}`);
  });
});
