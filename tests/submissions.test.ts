// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testDatabase, challengeBody, request, context } from "./support/database";
import { coordinatorRuntime } from "./support/coordinator";
import { env } from "cloudflare:workers";
import { createTeam, getTeamDetails, joinTeam, updateTeam } from "@/lib/teams";
import { saveChallenge } from "@/lib/challenges";
import { submitFlag } from "@/lib/submissions";
import { dynamicPoints, challengeScore } from "@/lib/scoring";
import { POST } from "@/app/api/challenges/[id]/submit/route";
import { POST as testFlag } from "@/app/api/admin/challenges/[id]/test-flag/route";
let f: Awaited<ReturnType<typeof testDatabase>>; let d: Awaited<ReturnType<typeof coordinatorRuntime>>;
beforeAll(async () => { f = await testDatabase(); d = await coordinatorRuntime(); Object.assign(env, { PARTICIPANT_COORDINATOR: d.namespace }); }, 30000);
afterAll(async () => { await Promise.all([f?.runtime.dispose(), d?.runtime.dispose()]); });
describe("authoritative submissions", () => {
  it("records a single team solve under concurrent submissions and retains attribution after moving", async () => {
    const admin = await f.identity(true); const owner = await f.identity(); const member = await f.identity();
    const id = (await saveChallenge(f.database, admin.viewer, f.flagSecret, challengeBody({ status: "published", decay: 2 }))).id;
    const team = await createTeam(f.database, owner.viewer, "Concurrent team");
    await joinTeam(f.database, member.viewer, (await getTeamDetails(f.database, team, owner.viewer))!.inviteCode);
    const results = await Promise.all([owner, member].map(person => submitFlag(f.database, person.viewer, f.flagSecret, d.namespace.getByName(person.viewer.id), id, "CTF{example}")));
    expect(results.map(result => result.result).sort()).toEqual(["already_solved", "correct"]);
    expect(await challengeScore(f.database, id, team)).toEqual({ points: 400, solveCount: 1, solved: true });
    await updateTeam(f.database, member.viewer, team, { action: "leave" });
    const newTeam = await createTeam(f.database, member.viewer, "Moved member team");
    expect((await submitFlag(f.database, member.viewer, f.flagSecret, d.namespace.getByName(member.viewer.id), id, "CTF{example}")).result).toBe("correct");
    expect(await challengeScore(f.database, id, team)).toEqual({ points: 100, solveCount: 2, solved: true });
    expect((await challengeScore(f.database, id, newTeam))?.points).toBe(100);
    expect(await f.database.prepare("SELECT count(*) AS n FROM solves WHERE challenge_id=?").bind(id).first("n")).toBe(2);
    const stored = await f.database.prepare("SELECT * FROM submissions WHERE challenge_id=?").bind(id).all(); expect(JSON.stringify(stored.results)).not.toContain("CTF{example}");
    await expect(saveChallenge(f.database, admin.viewer, f.flagSecret, challengeBody({ revision: 1, status: "draft" }), id)).rejects.toMatchObject({ status: 409 });
    expect((await testFlag(request("/test", admin.cookie, { flag: "CTF{example}" }), context(id))).status).toBe(200);
    expect(await f.database.prepare("SELECT count(*) AS n FROM submissions WHERE challenge_id=?").bind(id).first("n")).toBe(3);
  });
  it("limits attempts per participant and challenge with HTTP Retry-After", async () => {
    const admin = await f.database.prepare('SELECT id FROM "user" WHERE email=?').bind("organizer@example.test").first<{ id: string }>();
    const person = await f.identity(); await createTeam(f.database, person.viewer, "Rate limit team");
    const challenge = await f.database.prepare("SELECT id FROM challenges LIMIT 1").first<{ id: string }>();
    expect(admin).not.toBeNull();
    for (let i = 0; i < 10; i++) expect((await POST(request("/submit", person.cookie, { flag: "wrong" }), context(challenge!.id))).status).toBe(200);
    const response = await POST(request("/submit", person.cookie, { flag: "wrong" }), context(challenge!.id)); expect(response.status).toBe(429); expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await d.namespace.getByName(crypto.randomUUID()).consume(challenge!.id)).allowed).toBe(true);
    expect((await d.namespace.getByName(person.viewer.id).consume(crypto.randomUUID())).allowed).toBe(true);
  });
  it("rechecks membership, account status and challenge revision when writing", async () => {
    const person = await f.identity(); const team = await createTeam(f.database, person.viewer, "Atomic guard team");
    const challenge = await f.database.prepare("SELECT id FROM challenges LIMIT 1").first<{ id: string }>();
    const limiter = { consume: async () => { await updateTeam(f.database, person.viewer, team, { action: "delete" }); return { allowed: true, retryAfter: 0 }; } };
    await expect(submitFlag(f.database, person.viewer, f.flagSecret, limiter, challenge!.id, "CTF{example}")).rejects.toMatchObject({ status: 409 });
    expect(await f.database.prepare("SELECT count(*) AS n FROM submissions WHERE user_id=?").bind(person.viewer.id).first("n")).toBe(0);
    await createTeam(f.database, person.viewer, "Revision guard team");
    const revisionChanged = { consume: async () => { await f.database.prepare("UPDATE challenges SET revision=revision+1 WHERE id=?").bind(challenge!.id).run(); return { allowed: true, retryAfter: 0 }; } };
    await expect(submitFlag(f.database, person.viewer, f.flagSecret, revisionChanged, challenge!.id, "CTF{example}")).rejects.toMatchObject({ status: 409 });
    const suspended = { consume: async () => { await f.database.prepare('UPDATE "user" SET suspended=1 WHERE id=?').bind(person.viewer.id).run(); return { allowed: true, retryAfter: 0 }; } };
    await expect(submitFlag(f.database, person.viewer, f.flagSecret, suspended, challenge!.id, "CTF{example}")).rejects.toMatchObject({ status: 409 });
    expect(await f.database.prepare("SELECT count(*) AS n FROM submissions WHERE user_id=?").bind(person.viewer.id).first("n")).toBe(0);
    expect((await POST(request("/submit", "", { flag: "test" }), context(challenge!.id))).status).toBe(401);
  });
});
it("matches the parabolic formula at floor and boundary points", () => {
  expect([0, 1, 2, 50, 100].map(n => dynamicPoints(500, 100, 2, n))).toEqual([500, 400, 100, 100, 100]);
  expect(dynamicPoints(500, 100, 50, 1)).toBe(500); expect(dynamicPoints(500, 100, 50, 49)).toBe(116);
});
