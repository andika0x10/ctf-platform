import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TeamWorkspace } from "@/components/team-workspace";
import { DeleteControl } from "@/components/delete-control";
import type { TeamDetails } from "@/lib/teams";
import { router } from "./support/next-navigation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => { await act(() => root.unmount()); document.body.replaceChildren(); vi.unstubAllGlobals(); });
const team: TeamDetails = {
  id: "team-id", name: "Tim latihan", ownerUserId: "owner", status: "active", archivedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", events: [],
  members: [{ id: "owner", name: "Pembuat", joinedAt: "2026-01-01T00:00:00.000Z" }, { id: "member", name: "Anggota", joinedAt: "2026-01-02T00:00:00.000Z" }],
};
function button(label: string) {
  return [...container.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent === label)!;
}

it("lets the creator leave with an explanation of automatic ownership transfer", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true })); vi.stubGlobal("fetch", fetcher);
  await act(() => root.render(<TeamWorkspace team={team} viewer={{ id: "owner", role: "participant" }} />));
  await act(() => button("Keluar dari tim").click());
  expect(fetcher).not.toHaveBeenCalled();
  const confirmation = container.querySelector<HTMLElement>(".confirmation-panel")!;
  expect(confirmation.textContent).toContain("Kepemilikan otomatis beralih");
  expect(document.activeElement).toBe(confirmation);
  await act(async () => confirmation.querySelector<HTMLButtonElement>("button")!.click());
  expect(fetcher).toHaveBeenCalledWith("/api/teams/team-id", expect.objectContaining({ body: JSON.stringify({ action: "leave" }) }));
  expect(router.refresh).toHaveBeenCalled();
});

it("warns the last member that leaving permanently deletes the team", async () => {
  await act(() => root.render(<TeamWorkspace team={{ ...team, members: team.members.slice(0, 1) }} viewer={{ id: "owner", role: "participant" }} />));
  await act(() => button("Keluar dari tim").click());
  expect(container.querySelector(".confirmation-panel")!.textContent).toContain("dihapus permanen");
  expect(container.textContent).not.toContain("Arsipkan");
});

it("requires confirmation to delete, restores focus on cancel and keeps errors visible", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ error: "Challenge berubah. Muat ulang editor." }, { status: 409 })); vi.stubGlobal("fetch", fetcher);
  await act(() => root.render(<DeleteControl url="/api/admin/challenges/id" revision={2} label="Hapus challenge" description="Seluruh solve akan dihapus permanen." destination="/admin/challenges" />));
  const trigger = button("Hapus challenge");
  await act(() => trigger.click());
  expect(fetcher).not.toHaveBeenCalled();
  await act(() => button("Batal").click());
  expect(document.activeElement).toBe(trigger);
  expect(fetcher).not.toHaveBeenCalled();
  await act(() => trigger.click());
  await act(async () => container.querySelector<HTMLButtonElement>(".confirmation-panel .button")!.click());
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("Challenge berubah. Muat ulang editor.");
  expect(router.push).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(Response.json({ deleted: true }));
  await act(async () => container.querySelector<HTMLButtonElement>(".confirmation-panel .button")!.click());
  expect(fetcher).toHaveBeenLastCalledWith("/api/admin/challenges/id", expect.objectContaining({ method: "DELETE", body: JSON.stringify({ revision: 2 }) }));
  expect(router.push).toHaveBeenCalledWith("/admin/challenges");
});
