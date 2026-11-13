import { vi } from "vitest";
export const router = { push: vi.fn(), refresh: vi.fn() };
export function useRouter() { return router; }
export function usePathname() {
  return window.location.pathname;
}
