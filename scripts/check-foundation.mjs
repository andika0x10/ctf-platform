import assert from "node:assert/strict";

const origin = process.env.CHECK_ORIGIN || "http://localhost:5173";
const firstResponse = await fetch(`${origin}/api/health`);
assert.equal(firstResponse.status, 200, "Health endpoint must return 200 after local migrations");
assert.equal(firstResponse.headers.get("cache-control"), "no-store");
const first = await firstResponse.json();
assert.equal(first.status, "ok");
assert.deepEqual(first.services, { d1: "ok", durableObjects: "ok" });
if (process.env.EXPECTED_COORDINATOR_INITIALIZED_AT) {
  assert.equal(first.coordinator?.initializedAt, process.env.EXPECTED_COORDINATOR_INITIALIZED_AT,
    "Durable Object state must survive a server restart");
}

const checks = await Promise.all(Array.from({ length: 5 }, async () => {
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.status, "ok");
  if (first.coordinator) {
    assert.equal(result.coordinator.initializedAt, first.coordinator.initializedAt);
    assert.equal(result.coordinator.storage, "sqlite");
  }
  return result;
}));

for (const path of ["/", "/rules", "/challenges", "/scoreboard", "/announcements", "/team", "/login"]) {
  const response = await fetch(`${origin}${path}`);
  assert.equal(response.status, 200, `${path} must render`);
  const html = await response.text();
  assert.ok(html.includes('lang="id"'), `${path} must use Indonesian document language`);
  assert.ok(html.includes("CTF Platform"), `${path} must include the shared shell`);
}
assert.equal((await fetch(`${origin}/not-a-page`)).status, 404);
const font = await fetch(`${origin}/fonts/press-start-2p/PressStart2P-Regular.ttf`);
assert.equal(font.status, 200, "The pixel font must be served locally");
assert.ok((await font.arrayBuffer()).byteLength > 1000, "The font must contain binary data");
console.log(`Foundation verified: D1 + Durable Object, ${checks.length} concurrent health requests, shared pages and 404.`);
if (first.coordinator) console.log(`Durable initialization timestamp: ${first.coordinator.initializedAt}`);
