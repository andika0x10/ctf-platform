import assert from "node:assert/strict";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
const config = parseEnv(readFileSync(new URL("../.dev.vars", import.meta.url), "utf8"));
const origin = process.env.CHECK_ORIGIN || config.BETTER_AUTH_URL;
const parsed = new URL(origin);
assert.ok(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname), "Runtime fixtures are restricted to local HTTP.");
const file = fileURLToPath(new URL(`../.cloudflare/platform-smoke-${randomUUID()}.json`, import.meta.url));
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || "3d05ae4a-7641-4bc7-8c46-08edc42f201d";
function sql(statements) {
  writeFileSync(file, JSON.stringify(statements.map(s => ({ sql: s.sql, params: (s.params || []).map(String) }))));
  const result = execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/cf/bin/cf", import.meta.url)), "d1", "raw", databaseId, "--local", "--batch", `@${file}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024 });
  return JSON.parse(result).map(r => { assert.equal(r.success, true); return r.results.rows.map(row => Object.fromEntries(r.results.columns.map((key, i) => [key, row[i]]))); });
}
function cookie(person) { return `ctf.session_token=${encodeURIComponent(`${person.token}.${createHmac("sha256", config.BETTER_AUTH_SECRET.trim()).update(person.token).digest("base64")}`)}`; }
async function call(path, person, body, method = body === undefined ? "GET" : "POST") {
  return fetch(origin + path, { method, redirect: "manual", headers: { origin, "cf-connecting-ip": "127.0.0.1", ...(person ? { cookie: cookie(person) } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60000) });
}
async function json(path, person, body, expected = 200, method) {
  const response = await call(path, person, body, method); assert.equal(response.status, expected, `${method || "request"} ${path}`); return response.json();
}
const runId = randomUUID().slice(0, 8); const people = []; const teams = []; const challenges = []; const notes = []; let settingsBackup;
const identity = email => ({ id: randomUUID(), sessionId: randomUUID(), token: randomBytes(32).toString("hex"), email });
try {
  const allowlist = (config.ORGANIZER_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  assert.ok(allowlist.length, "Configure a local organizer email before this check.");
  const existing = sql([{ sql: 'SELECT lower(email) AS email FROM "user"' }])[0].map(row => row.email);
  const email = allowlist.find(value => !existing.includes(value));
  assert.ok(email, "This check needs an unused email in the LOCAL organizer allowlist; it never impersonates or modifies existing users.");
  const admin = identity(email); people.push(admin);
  const players = Array.from({ length: 100 }, () => identity(`ctf-load-${randomUUID()}@example.invalid`)); people.push(...players);
  const now = Date.now();
  const seed = people.flatMap((person, i) => [
    { sql: 'INSERT INTO "user"(id,name,email,emailVerified,profileComplete,suspended,createdAt,updatedAt) VALUES(?,?,?,1,1,0,?,?)', params: [person.id, `Smoke ${runId} ${i}`, person.email, now, now] },
    { sql: 'INSERT INTO "session"(id,token,userId,expiresAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?)', params: [person.sessionId, person.token, person.id, now + 3600000, now, now] },
  ]);
  for (let i = 0; i < seed.length; i += 40) sql(seed.slice(i, i + 40));
  const body = { title: `Smoke challenge ${runId}`, category: "web", difficulty: "easy", description: "## Smoke description\n\nFind the flag.", connectionInfo: "nc example.invalid 31337", links: [{ name: "source.zip", url: "https://example.invalid/source.zip" }], hint: "Smoke free hint", initialPoints: 500, minimumPoints: 100, decay: 50, status: "draft", flag: `CTF{smoke_${runId}}` };
  const created = await json("/api/admin/challenges", admin, body, 201); challenges.push(created.id);
  assert.equal((await call(`/challenges/${created.id}`, players[0])).status, 404);
  const live = await json(`/api/admin/challenges/${created.id}`, admin, { ...body, status: "published", revision: 1 }, 200, "PATCH");
  assert.equal(live.revision, 2);
  assert.equal((await call(`/api/admin/challenges/${created.id}`, players[0])).status, 403);
  const editor = await json(`/api/admin/challenges/${created.id}`, admin);
  assert.ok(!JSON.stringify(editor).includes(body.flag)); assert.ok(!JSON.stringify(editor).includes("flag_digest"));
  assert.deepEqual(await json(`/api/challenges/${created.id}/hint`, players[0]), { hint: body.hint });
  assert.equal((await call(`/api/challenges/${created.id}/submit`, players[0], { flag: body.flag })).status, 403);
  for (let start = 0; start < 50; start += 10) {
    await Promise.all(Array.from({ length: 10 }, async (_, offset) => {
      const index = start + offset; const owner = players[index * 2]; const member = players[index * 2 + 1];
      const team = await json("/api/teams", owner, { name: `Smoke ${runId} Team ${index}` }, 201); teams.push(team.id);
      const details = await json(`/api/teams/${team.id}`, owner); await json("/api/teams/join", member, { code: details.team.inviteCode });
    }));
  }
  // Warm all modules before measuring the simultaneous submission burst.
  await call(`/challenges/${created.id}`, players[0]);
  const start = performance.now();
  const measurements = await Promise.all(players.map(async person => {
    const began = performance.now(); const result = await json(`/api/challenges/${created.id}/submit`, person, { flag: body.flag }); return { result: result.result, ms: performance.now() - began };
  }));
  const totalMs = performance.now() - start;
  assert.equal(measurements.filter(r => r.result === "correct").length, 50); assert.equal(measurements.filter(r => r.result === "already_solved").length, 50);
  const stored = sql([{ sql: "SELECT count(*) AS n FROM solves WHERE challenge_id=?", params: [created.id] }, { sql: "SELECT count(*) AS n FROM submissions WHERE challenge_id=?", params: [created.id] }]);
  assert.equal(stored[0][0].n, 50); assert.equal(stored[1][0].n, 100);
  const ranking = await json("/api/scoreboard"); const fixtureTeams = ranking.teams.filter(t => teams.includes(t.id));
  // With existing teams, inspect all pages before asserting the fixture scores.
  for (let page = 2; page <= Math.ceil(ranking.total / 50); page++) fixtureTeams.push(...(await json(`/api/scoreboard?page=${page}`)).teams.filter(t => teams.includes(t.id)));
  assert.equal(fixtureTeams.length, 50); assert.ok(fixtureTeams.every(t => t.score === 100 && t.solveCount === 1));
  assert.ok(!JSON.stringify(ranking).includes(players[0].email));
  const profile = await call(`/teams/${teams[0]}`); assert.equal(profile.status, 200); assert.ok(!(await profile.text()).includes(players[0].email));
  for (const path of ["/admin", "/admin/challenges", "/admin/challenges/new", `/admin/challenges/${created.id}`, "/admin/participants", "/admin/teams", "/admin/submissions", "/admin/settings", "/admin/announcements", "/admin/announcements/new"]) {
    const response = await call(path, admin); assert.equal(response.status, 200, `${path} renders`); assert.match(response.headers.get("cache-control") || "", /no-store|private|no-cache/); await response.arrayBuffer();
  }
  const note = await json("/api/admin/announcements", admin, { title: `Smoke news ${runId}`, body: "A public smoke announcement.", status: "draft" }, 201); notes.push(note.id);
  assert.ok(!(await (await call("/announcements")).text()).includes(`Smoke news ${runId}`));
  await json(`/api/admin/announcements/${note.id}`, admin, { title: `Smoke news ${runId}`, body: "A public smoke announcement.", status: "published", revision: 1 }, 200, "PATCH");
  assert.ok((await (await call("/announcements")).text()).includes(`Smoke news ${runId}`));
  settingsBackup = sql([{ sql: "SELECT key,value,updated_at FROM platform_settings WHERE key IN('platform_name','rules_markdown','registration_open')" }])[0];
  const old = Object.fromEntries(settingsBackup.map(row => [row.key, row.value]));
  await json("/api/admin/settings", admin, { platformName: `Smoke ${runId}`, rules: `Smoke rules ${runId}`, registrationOpen: old.registration_open === "true" }, 200, "PATCH");
  assert.ok((await (await call("/rules")).text()).includes(`Smoke rules ${runId}`));
  const csv = await call("/api/admin/export", admin); assert.equal(csv.status, 200); const csvText = await csv.text(); assert.ok(!csvText.includes(email)); assert.ok(csvText.includes(`Smoke ${runId} Team`));
  assert.equal((await call("/api/admin/export", players[0])).status, 403);
  let limited;
  for (let i = 0; i < 11; i++) { limited = await call(`/api/challenges/${created.id}/submit`, players[0], { flag: "wrong" }); if (limited.status === 429) break; assert.equal(limited.status, 200); }
  assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) > 0);
  await json(`/api/admin/participants/${players[0].id}`, admin, { suspended: true }, 200, "PATCH");
  assert.equal((await call("/account", players[0])).status, 307);
  assert.equal((await call(`/api/challenges/${created.id}/submit`, players[0], { flag: body.flag })).status, 401);
  const sorted = measurements.map(r => r.ms).sort((a, b) => a - b);
  const report = { timestamp: new Date().toISOString(), origin, participants: 100, teams: 50, correct: 50, alreadySolved: 50, errors: 0, totalMs: Math.round(totalMs), p50Ms: Math.round(sorted[49]), p95Ms: Math.round(sorted[94]) };
  writeFileSync(new URL(`../.cloudflare/load-${process.env.CHECK_LABEL || "dev"}.json`, import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report)); console.log("Platform HTTP verified: authoring, role guards, draft privacy, free hints, 100 concurrent submissions, dynamic score, profiles, admin SSR, announcements, settings, CSV, rate limiting, suspension.");
} finally {
  // All cleanup predicates target generated UUIDs; no existing account is modified.
  if (settingsBackup) {
    const owned = { platform_name: `Smoke ${runId}`, rules_markdown: `Smoke rules ${runId}` };
    sql(settingsBackup.filter(row => owned[row.key]).map(row => ({ sql: "UPDATE platform_settings SET value=?,updated_at=? WHERE key=? AND value=?", params: [row.value, row.updated_at, row.key, owned[row.key]] })));
  }
  const cleanup = [];
  for (const id of challenges) cleanup.push({ sql: "DELETE FROM solves WHERE challenge_id=?", params: [id] }, { sql: "DELETE FROM submissions WHERE challenge_id=?", params: [id] }, { sql: "DELETE FROM challenges WHERE id=?", params: [id] });
  for (const id of notes) cleanup.push({ sql: "DELETE FROM announcements WHERE id=?", params: [id] });
  for (const id of teams) cleanup.push({ sql: "UPDATE teams SET status='archived' WHERE id=?", params: [id] }, { sql: "DELETE FROM team_members WHERE team_id=?", params: [id] }, { sql: "DELETE FROM team_events WHERE team_id=?", params: [id] }, { sql: "DELETE FROM teams WHERE id=?", params: [id] });
  for (const p of people) cleanup.push({ sql: 'DELETE FROM "session" WHERE userId=?', params: [p.id] }, { sql: 'DELETE FROM "user" WHERE id=? AND email=?', params: [p.id, p.email] });
  try { for (let i = 0; i < cleanup.length; i += 40) sql(cleanup.slice(i, i + 40)); }
  finally { try { unlinkSync(file); } catch {} }
}
