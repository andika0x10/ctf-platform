// @vitest-environment node
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { expect, it } from "vitest";
import { coordinatorRuntime } from "./support/coordinator";
it("persists rate limits across a runtime restart and isolates participants", async () => {
  const base = resolve(".cloudflare/tests"); await mkdir(base, { recursive: true }); const path = await mkdtemp(resolve(base, "coordinator-"));
  let app: Awaited<ReturnType<typeof coordinatorRuntime>> | undefined;
  try {
    app = await coordinatorRuntime(path); const stub = app.namespace.getByName("one-person");
    const results = await Promise.all(Array.from({ length: 12 }, () => stub.consume("one-challenge")));
    expect(results.filter(result => result.allowed)).toHaveLength(10);
    await app.runtime.dispose(); app = await coordinatorRuntime(path);
    expect((await app.namespace.getByName("one-person").consume("one-challenge")).allowed).toBe(false);
    expect((await app.namespace.getByName("another-person").consume("one-challenge")).allowed).toBe(true);
  } finally {
    await app?.runtime.dispose();
    if (!resolve(path).startsWith(base + sep)) throw new Error("Unsafe test cleanup path");
    await rm(path, { recursive: true, force: true });
  }
}, 30000);
