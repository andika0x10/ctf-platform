import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { deleteAnnouncement, saveAnnouncement } from "@/lib/operations";
import { jsonBody, jsonResponse, onlyFields, handleRequestError } from "@/lib/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const viewer = await requireApiViewer(request, { organizer: true, profile: true }); return jsonResponse(await saveAnnouncement(env.DB, viewer, await jsonBody(request, 131072), (await params).id)); } catch (error) { return handleRequestError(error); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireApiViewer(request, { organizer: true, profile: true });
    const body = await jsonBody(request); onlyFields(body, ["revision"]);
    await deleteAnnouncement(env.DB, viewer, (await params).id, body.revision);
    return jsonResponse({ deleted: true });
  } catch (error) { return handleRequestError(error); }
}
