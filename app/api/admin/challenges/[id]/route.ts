import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { getAdminChallenge, saveChallenge } from "@/lib/challenges";
import { handleRequestError, jsonBody, jsonResponse, RequestError } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const viewer = await requireApiViewer(request, { organizer: true, profile: true });
    const challenge = await getAdminChallenge(env.DB, viewer, (await context.params).id);
    if (!challenge) throw new RequestError(404, "Challenge tidak ditemukan.");
    return jsonResponse({ challenge });
  } catch (error) { return handleRequestError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const viewer = await requireApiViewer(request, { organizer: true, profile: true });
    return jsonResponse(await saveChallenge(env.DB, viewer, env.FLAG_SIGNING_SECRET, await jsonBody(request, 131072), (await context.params).id));
  } catch (error) { return handleRequestError(error); }
}
