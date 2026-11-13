import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { handleRequestError, jsonBody, jsonResponse, onlyFields } from "@/lib/http";
import { createTeam, getCurrentTeam } from "@/lib/teams";

export async function GET(request: Request) {
  try {
    const viewer = await requireApiViewer(request, { profile: true });
    return jsonResponse({ team: await getCurrentTeam(env.DB, viewer) });
  } catch (error) { return handleRequestError(error); }
}
export async function POST(request: Request) {
  try {
    const viewer = await requireApiViewer(request, { profile: true, participant: true });
    const body = await jsonBody(request); onlyFields(body, ["name"]);
    const id = await createTeam(env.DB, viewer, body.name);
    return jsonResponse({ id }, 201);
  } catch (error) { return handleRequestError(error); }
}
