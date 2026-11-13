import { env } from "cloudflare:workers";
import { requireApiViewer } from "@/lib/auth/api";
import { scoreboardCSV } from "@/lib/operations";
import { handleRequestError } from "@/lib/http";
export async function GET(request: Request) {
  try { const viewer = await requireApiViewer(request, { organizer: true, profile: true }); return new Response(await scoreboardCSV(env.DB, viewer), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="peringkat.csv"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); } catch (error) { return handleRequestError(error); }
}
