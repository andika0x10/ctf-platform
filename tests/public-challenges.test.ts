// @vitest-environment node
import { afterAll, beforeAll, expect, it } from "vitest";
import { testDatabase, request, context, challengeBody } from "./support/database";
import { deleteChallenge, saveChallenge } from "@/lib/challenges";
import { getPlayableChallenge, listPlayableChallenges } from "@/lib/public-challenges";
import { GET } from "@/app/api/challenges/[id]/hint/route";
let fixture: Awaited<ReturnType<typeof testDatabase>>;
beforeAll(async () => { fixture = await testDatabase(); }, 30000);
afterAll(async () => { await fixture?.runtime.dispose(); });
it("exposes only published challenges and reveals hints only to signed-in readers", async () => {
  const admin = await fixture.identity(true); const participant = await fixture.identity();
  const draft = await saveChallenge(fixture.database, admin.viewer, fixture.flagSecret, challengeBody());
  const live = await saveChallenge(fixture.database, admin.viewer, fixture.flagSecret, challengeBody({ status: "published" }));
  const deleted = await saveChallenge(fixture.database, admin.viewer, fixture.flagSecret, challengeBody());
  await deleteChallenge(fixture.database, admin.viewer, deleted.id, 1);
  expect(await getPlayableChallenge(fixture.database, draft.id)).toBeNull(); expect(await getPlayableChallenge(fixture.database, deleted.id)).toBeNull();
  const document = await getPlayableChallenge(fixture.database, live.id);
  expect(document?.hasHint).toBe(true); expect(document).not.toHaveProperty("hint"); expect(document).not.toHaveProperty("flag_digest"); expect(JSON.stringify(document)).not.toContain("CTF{example}");
  expect((await listPlayableChallenges(fixture.database)).total).toBe(1); expect((await listPlayableChallenges(fixture.database, "", "crypto")).total).toBe(0);
  expect((await GET(request("/hint", "", undefined, "GET"), context(live.id))).status).toBe(401);
  expect((await GET(request("/hint", participant.cookie, undefined, "GET"), context(draft.id))).status).toBe(404);
  const hint = await GET(request("/hint", participant.cookie, undefined, "GET"), context(live.id));
  expect(hint.status).toBe(200); expect(hint.headers.get("cache-control")).toContain("no-store"); expect(await hint.json()).toEqual({ hint: "Read the source." });
});
