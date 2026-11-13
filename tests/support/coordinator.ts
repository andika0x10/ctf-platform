import { readFile } from "node:fs/promises";
import { transformWithOxc } from "vite";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import type { ParticipantCoordinator } from "@/lib/durable-objects/participant-coordinator";
export async function coordinatorRuntime(persist?: string) {
  const source = await readFile(new URL("../../lib/durable-objects/participant-coordinator.ts", import.meta.url), "utf8");
  const script = (await transformWithOxc(source, "participant-coordinator.ts", { target: "es2022" })).code + '\nexport default {fetch(){return new Response("native DO tests")}}';
  const runtime = new Miniflare(convertV4MiniflareOptions({ modules: true, script, compatibilityDate: "2026-11-13", durableObjects: { LIMITER: { className: "ParticipantCoordinator", useSQLite: true } }, ...(persist ? { resourcePersistencePath: persist } : {}) }));
  const { LIMITER } = await runtime.getBindings<{ LIMITER: DurableObjectNamespace<ParticipantCoordinator> }>();
  return { runtime, namespace: LIMITER };
}
