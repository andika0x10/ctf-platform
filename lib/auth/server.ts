import { env } from "cloudflare:workers";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthConfiguration } from "./config";
import { readViewer } from "./viewer";

export const currentViewer = cache(async () => {
  return readViewer(env.DB, getAuthConfiguration(env), await headers());
});

export async function requirePageViewer(returnTo: string, options: { organizer?: boolean; profile?: boolean } = {}) {
  const viewer = await currentViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (options.organizer && viewer.role !== "organizer") redirect("/account?notice=organizer-only");
  if (options.profile && !viewer.profileComplete) redirect(`/account?next=${encodeURIComponent(returnTo)}`);
  return viewer;
}
