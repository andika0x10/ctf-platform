import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { handleRequestError, jsonBody, jsonResponse, onlyFields, RequestError } from "@/lib/http";
import { getTeamDetails, updateTeam, type TeamAction } from "@/lib/teams";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const viewer = await requireApiViewer(request, { profile: true });
    const team = await getTeamDetails(env.DB, (await context.params).id, viewer);
    if (!team) throw new RequestError(404, "Tim tidak ditemukan atau tidak dapat diakses.");
    return jsonResponse({ team });
  } catch (error) { return handleRequestError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const viewer = await requireApiViewer(request, { profile: true });
    const body = await jsonBody(request);
    let action: TeamAction;
    switch (body.action) {
      case "rename":
        onlyFields(body, ["action", "name"]);
        if (typeof body.name !== "string") throw new RequestError(400, "Nama tim belum diisi.");
        action = { action: "rename", name: body.name }; break;
      case "rotate-invite": case "leave": case "delete":
        onlyFields(body, ["action"]); action = { action: body.action }; break;
      case "remove-member": case "transfer-owner":
        onlyFields(body, ["action", "userId"]);
        if (typeof body.userId !== "string" || body.userId.length > 200) throw new RequestError(400, "Anggota tidak valid.");
        action = { action: body.action, userId: body.userId }; break;
      default: throw new RequestError(400, "Aksi tim tidak dikenali.");
    }
    await updateTeam(env.DB, viewer, (await context.params).id, action);
    return jsonResponse({ success: true });
  } catch (error) { return handleRequestError(error); }
}
