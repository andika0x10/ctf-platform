import { env } from "cloudflare:workers";
import { getAuthConfiguration } from "@/lib/auth/config";
import { createAuth } from "@/lib/auth/factory";
import { jsonResponse } from "@/lib/http";

async function handler(request: Request) {
  const configuration = getAuthConfiguration(env);
  if (!configuration) return jsonResponse({ error: "Login Google belum tersedia. Hubungi panitia." }, 503);
  return createAuth(env.DB, configuration).handler(request);
}
export const GET = handler;
export const POST = handler;
