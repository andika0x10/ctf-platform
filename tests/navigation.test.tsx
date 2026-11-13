import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/site-header";
import type { UserRole } from "@/lib/navigation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  document.body.replaceChildren();
});
async function render(role?: UserRole) {
  await act(() => root.render(<SiteHeader role={role} />));
}
function trigger(id: string) {
  return container.querySelector<HTMLButtonElement>(`#nav-trigger-${id}`)!;
}
function panel(id: string) {
  return container.querySelector<HTMLDivElement>(`#nav-panel-${id}`)!;
}
async function click(element: HTMLElement) {
  await act(() => element.click());
}

describe("mega menu disclosures", () => {
  it("exposes only public groups to guests and participants", async () => {
    await render();
    expect(trigger("organizer")).toBeNull();
    expect(container.querySelector<HTMLAnchorElement>(".header-account")?.getAttribute("href")).toBe("/login");
    await render("participant");
    expect(trigger("organizer")).toBeNull();
    expect(container.querySelector<HTMLAnchorElement>(".header-account")?.getAttribute("href")).toBe("/account");
  });

  it("provides the grouped organizer navigation only for organizers", async () => {
    await render("organizer");
    await click(trigger("organizer"));
    expect(panel("organizer").hidden).toBe(false);
    expect(panel("organizer").querySelectorAll(".mega-column").length).toBe(3);
    expect(panel("organizer").querySelector('a[href="/admin/submissions"]')).not.toBeNull();
  });

  it("opens one group at a time and toggles the current group closed", async () => {
    await render();
    await click(trigger("practice"));
    expect(trigger("practice").getAttribute("aria-expanded")).toBe("true");
    expect(panel("practice").hidden).toBe(false);
    await click(trigger("information"));
    expect(panel("practice").hidden).toBe(true);
    expect(panel("information").hidden).toBe(false);
    expect(container.querySelectorAll(".mega-panel:not([hidden])").length).toBe(1);
    await click(trigger("information"));
    expect(panel("information").hidden).toBe(true);
  });

  it("closes with Escape and returns keyboard focus to the trigger", async () => {
    await render();
    await click(trigger("practice"));
    const link = panel("practice").querySelector<HTMLAnchorElement>("a")!;
    await act(() => { link.focus(); });
    await act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(panel("practice").hidden).toBe(true);
    expect(document.activeElement).toBe(trigger("practice"));
  });

  it("closes when clicking or moving focus outside the header", async () => {
    await render();
    await click(trigger("practice"));
    await act(() => { document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });
    expect(panel("practice").hidden).toBe(true);

    await click(trigger("practice"));
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    await act(() => { trigger("practice").focus(); });
    await act(() => { outside.focus(); });
    expect(panel("practice").hidden).toBe(true);
  });

  it("closes both mobile navigation and the group after selecting a link", async () => {
    await render();
    const mobile = container.querySelector<HTMLButtonElement>(".mobile-toggle")!;
    await click(mobile);
    expect(mobile.getAttribute("aria-expanded")).toBe("true");
    await click(trigger("practice"));
    await click(panel("practice").querySelector<HTMLAnchorElement>("a")!);
    expect(panel("practice").hidden).toBe(true);
    expect(mobile.getAttribute("aria-expanded")).toBe("false");
  });

  it("marks the current destination and its parent group", async () => {
    window.history.replaceState(null, "", "/scoreboard");
    await render();
    expect(trigger("practice").getAttribute("data-current")).toBe("true");
    expect(panel("practice").querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe("/scoreboard");
  });
});
