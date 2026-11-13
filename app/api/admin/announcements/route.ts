import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { saveAnnouncement } from "@/lib/operations";
import { jsonBody, jsonResponse, handleRequestError } from "@/lib/http";
export async function POST(request: Request) {
  try { const viewer = await requireApiViewer(request, { organizer: true, profile: true }); return jsonResponse(await saveAnnouncement(env.DB, viewer, await jsonBody(request, 131072)), 201); } catch (error) { return handleRequestError(error); }
}
