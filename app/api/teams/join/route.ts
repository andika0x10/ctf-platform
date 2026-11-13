import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { handleRequestError, jsonBody, jsonResponse, onlyFields } from "@/lib/http";
import { joinTeam } from "@/lib/teams";

export async function POST(request: Request) {
  try {
    const viewer = await requireApiViewer(request, { profile: true, participant: true });
    const body = await jsonBody(request); onlyFields(body, ["code"]);
    return jsonResponse({ id: await joinTeam(env.DB, viewer, body.code) });
  } catch (error) { return handleRequestError(error); }
}
