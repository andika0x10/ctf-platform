import { env } from "cloudflare:workers";
import { RequestError, mutationOrigin } from "@/lib/http";
import { getAuthConfiguration } from "./config";
import { readViewer } from "./viewer";

export async function requireApiViewer(request: Request, options: { profile?: boolean; participant?: boolean; organizer?: boolean } = {}) {
  if (!["GET", "HEAD"].includes(request.method)) mutationOrigin(request);
  const viewer = await readViewer(env.DB, getAuthConfiguration(env), request.headers);
  if (!viewer) throw new RequestError(401, "Masuk terlebih dahulu untuk melanjutkan.");
  if (options.profile && !viewer.profileComplete) throw new RequestError(403, "Simpan nama tampilanmu terlebih dahulu.");
  if (options.participant && viewer.role !== "participant") throw new RequestError(403, "Aksi ini tersedia untuk akun peserta.");
  if (options.organizer && viewer.role !== "organizer") throw new RequestError(403, "Aksi ini hanya tersedia untuk panitia.");
  return viewer;
}
