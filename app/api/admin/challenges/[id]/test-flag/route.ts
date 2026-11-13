import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { verifyFlag } from "@/lib/flags";
import { jsonBody, onlyFields, jsonResponse, handleRequestError, RequestError } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiViewer(request, { organizer: true, profile: true });
    const id = (await params).id; const body = await jsonBody(request); onlyFields(body, ["flag"]);
    const row = await env.DB.prepare("SELECT flag_digest FROM challenges WHERE id=?").bind(id).first<{ flag_digest: string }>();
    if (!row) throw new RequestError(404, "Challenge tidak tersedia.");
    return jsonResponse({ valid: await verifyFlag(env.FLAG_SIGNING_SECRET, id, body.flag, row.flag_digest) });
  } catch (error) { return handleRequestError(error); }
}
