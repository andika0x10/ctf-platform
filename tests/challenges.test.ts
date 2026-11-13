// @vitest-environment node
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { testDatabase, request, context, challengeBody } from "./support/database";
import { POST } from "@/app/api/admin/challenges/route";
import { GET, PATCH } from "@/app/api/admin/challenges/[id]/route";
import { flagDigest, verifyFlag } from "@/lib/flags";
let fixture: Awaited<ReturnType<typeof testDatabase>>;
beforeAll(async () => { fixture = await testDatabase(); }, 30000);
afterAll(async () => { await fixture?.runtime.dispose(); });
describe("organizer challenge authoring", () => {
  it("guards roles, stores only a keyed digest, preserves flag on edit, rejects stale editors", async () => {
    const admin = await fixture.identity(true); const participant = await fixture.identity();
    expect((await POST(request("/api/admin/challenges", participant.cookie, challengeBody()))).status).toBe(403);
    expect((await POST(request("/api/admin/challenges", "", challengeBody()))).status).toBe(401);
    const created = await POST(request("/api/admin/challenges", admin.cookie, challengeBody())); expect(created.status).toBe(201);
    const { id } = await created.json() as { id: string };
    const stored = await fixture.database.prepare("SELECT flag_digest FROM challenges WHERE id=?").bind(id).first<{ flag_digest: string }>();
    expect(stored!.flag_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(await verifyFlag(fixture.flagSecret, id, " CTF{example} ", stored!.flag_digest)).toBe(true);
    expect(await verifyFlag(fixture.flagSecret, id, "ctf{example}", stored!.flag_digest)).toBe(false);
    const response = await GET(request(`/api/admin/challenges/${id}`, admin.cookie, undefined, "GET"), context(id));
    const data = await response.json(); expect(JSON.stringify(data)).not.toContain("flag_digest"); expect(JSON.stringify(data)).not.toContain("CTF{example}");
    expect((await PATCH(request(`/api/admin/challenges/${id}`, admin.cookie, challengeBody({ flag: "", revision: 1, status: "published" }), "PATCH"), context(id))).status).toBe(200);
    expect((await fixture.database.prepare("SELECT flag_digest FROM challenges WHERE id=?").bind(id).first<{ flag_digest: string }>())!.flag_digest).toBe(stored!.flag_digest);
    expect((await PATCH(request(`/api/admin/challenges/${id}`, admin.cookie, challengeBody({ revision: 1 }), "PATCH"), context(id))).status).toBe(409);
    expect(await flagDigest(fixture.flagSecret, "another", "CTF{example}")).not.toBe(stored!.flag_digest);
  });
  it("rejects unsafe downloads, invalid scoring, unknown fields and missing flags", async () => {
    const adminRow = await fixture.database.prepare('SELECT id FROM "user" WHERE email=?').bind("organizer@example.test").first<{ id: string }>();
    // Reuse the organizer through a fresh real session rather than duplicate the unique email.
    expect(adminRow).not.toBeNull();
    const { challengeInput } = await import("@/lib/challenges");
    for (const body of [challengeBody({ links: [{ name: "bad", url: "javascript:alert(1)" }] }), challengeBody({ minimumPoints: 501 }), challengeBody({ initialPoints: 1.1 }), challengeBody({ role: "organizer" }), challengeBody({ category: "__proto__" })]) expect(() => challengeInput(body)).toThrow();
    await expect(flagDigest(undefined, "id", "flag")).rejects.toMatchObject({ status: 503 });
  });
});
