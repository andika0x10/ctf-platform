import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { revealHint } from "@/lib/public-challenges";
import { jsonResponse, handleRequestError } from "@/lib/http";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireApiViewer(request, { profile: true }); return jsonResponse({ hint: await revealHint(env.DB, (await params).id) }); }
  catch (error) { return handleRequestError(error); }
}
