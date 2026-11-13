import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { submitFlag, AttemptLimitError } from "@/lib/submissions";
import { jsonBody, onlyFields, jsonResponse, handleRequestError } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireApiViewer(request, { participant: true, profile: true });
    const body = await jsonBody(request); onlyFields(body, ["flag"]);
    return jsonResponse(await submitFlag(env.DB, viewer, env.FLAG_SIGNING_SECRET, env.PARTICIPANT_COORDINATOR.getByName(viewer.id), (await params).id, body.flag));
  } catch (error) {
    const response = handleRequestError(error);
    if (error instanceof AttemptLimitError) response.headers.set("Retry-After", String(error.retryAfter));
    return response;
  }
}
