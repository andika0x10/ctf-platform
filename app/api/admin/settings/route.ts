import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { saveSettings } from "@/lib/operations";
import { jsonBody, jsonResponse, handleRequestError } from "@/lib/http";
export async function PATCH(request: Request) {
  try { const viewer = await requireApiViewer(request, { organizer: true, profile: true }); await saveSettings(env.DB, viewer, await jsonBody(request, 131072)); return jsonResponse({ saved: true }); } catch (error) { return handleRequestError(error); }
}
