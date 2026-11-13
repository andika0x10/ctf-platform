import { env } from "cloudflare:workers";
import { standings } from "@/lib/standings";
import { pageNumber } from "@/lib/public-challenges";
import { jsonResponse, handleRequestError } from "@/lib/http";
export async function GET(request: Request) {
  try { return jsonResponse(await standings(env.DB, pageNumber(new URL(request.url).searchParams.get("page")))); } catch (error) { return handleRequestError(error); }
}
