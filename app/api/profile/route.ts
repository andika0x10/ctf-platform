import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { handleRequestError, jsonBody, jsonResponse, onlyFields, RequestError } from "@/lib/http";
import { displayName } from "@/lib/validation";

export async function PATCH(request: Request) {
  try {
    const viewer = await requireApiViewer(request);
    const body = await jsonBody(request);
    onlyFields(body, ["name"]);
    const name = displayName(body.name);
    const result = await env.DB.prepare('UPDATE "user" SET name = ?, profileComplete = 1, updatedAt = ? WHERE id = ? AND suspended = 0 AND emailVerified = 1')
      .bind(name, Date.now(), viewer.id).run();
    if (!result.meta.changes) throw new RequestError(403, "Akun ini tidak dapat mengubah profil.");
    return jsonResponse({ user: { ...viewer, name, profileComplete: true } });
  } catch (error) { return handleRequestError(error); }
}
