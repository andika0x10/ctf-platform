import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { FlagForm } from "@/components/flag-form";
import { ChallengeHint } from "@/components/challenge-hint";
import { LiveRefresh } from "@/components/live-refresh";
import { router } from "./support/next-navigation";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement; let root: Root;
beforeEach(() => { vi.clearAllMocks(); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(() => root.unmount()); document.body.replaceChildren(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it("keeps an incorrect flag editable, shows rate-limit errors, and refreshes after a correct solve", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ result: "incorrect" })).mockResolvedValueOnce(Response.json({ error: "Coba lagi dalam 30 detik." }, { status: 429 })).mockResolvedValueOnce(Response.json({ result: "correct" })); vi.stubGlobal("fetch", fetcher);
  await act(() => root.render(<FlagForm id="challenge-id" />));
  const form = container.querySelector("form")!;
  for (const message of ["Flag belum tepat", "Coba lagi dalam 30 detik.", "Flag benar"]) {
    await act(async () => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(container.textContent).toContain(message);
  }
  expect(fetcher.mock.calls[0][0]).toBe("/api/challenges/challenge-id/submit"); expect(router.refresh).toHaveBeenCalledTimes(1);
});
it("disables submission when the current team has already solved", async () => {
  await act(() => root.render(<FlagForm id="challenge-id" solved />));
  expect(container.querySelector("input")!.disabled).toBe(true); expect(container.querySelector("button")!.disabled).toBe(true); expect(container.textContent).toContain("Sudah diselesaikan oleh timmu.");
});
it("fetches hints only after the reader asks and renders safe Markdown", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ hint: "Read **the source**. <script>bad()</script>" })); vi.stubGlobal("fetch", fetcher);
  await act(() => root.render(<ChallengeHint id="challenge-id" />)); expect(fetcher).not.toHaveBeenCalled();
  await act(async () => { container.querySelector("button")!.click(); });
  expect(container.querySelector("strong")!.textContent).toBe("the source"); expect(container.querySelector("script")).toBeNull(); expect(fetcher).toHaveBeenCalledTimes(1);
});
it("polls only visible pages and clears the timer on unmount", async () => {
  vi.useFakeTimers(); Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  await act(() => root.render(<LiveRefresh />)); await act(() => vi.advanceTimersByTime(30000)); expect(router.refresh).not.toHaveBeenCalled();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); await act(() => vi.advanceTimersByTime(30000)); expect(router.refresh).toHaveBeenCalledTimes(1);
  await act(() => root.render(null)); await act(() => vi.advanceTimersByTime(30000)); expect(router.refresh).toHaveBeenCalledTimes(1);
});
