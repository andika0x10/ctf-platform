import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { saveChallenge } from "@/lib/challenges";
import { handleRequestError, jsonBody, jsonResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    const viewer = await requireApiViewer(request, { organizer: true, profile: true });
    return jsonResponse(await saveChallenge(env.DB, viewer, env.FLAG_SIGNING_SECRET, await jsonBody(request, 131072)), 201);
  } catch (error) { return handleRequestError(error); }
}
