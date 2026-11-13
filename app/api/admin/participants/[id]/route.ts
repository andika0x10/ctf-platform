import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { getAuthConfiguration } from "@/lib/auth/config";
import { suspendParticipant } from "@/lib/operations";
import { jsonBody, onlyFields, jsonResponse, handleRequestError } from "@/lib/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireApiViewer(request, { organizer: true, profile: true }); const body = await jsonBody(request); onlyFields(body, ["suspended"]);
    await suspendParticipant(env.DB, viewer, getAuthConfiguration(env)!.organizerEmails, (await params).id, body.suspended); return jsonResponse({ saved: true });
  } catch (error) { return handleRequestError(error); }
}
