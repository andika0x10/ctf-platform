import type { Viewer } from "./auth/viewer";
import { RequestError, onlyFields } from "./http";
import { flagDigest } from "./flags";
import { categoryNames, difficultyNames, type ChallengeDocument, type DownloadLink } from "./challenge-types";

type ChallengeRow = { id: string; title: string; category: string; difficulty: string; description: string; connection_info: string; links_json: string; hint: string; initial_points: number; minimum_points: number; decay: number; status: string; revision: number; created_at: string; updated_at: string };
const columns = "id, title, category, difficulty, description, connection_info, links_json, hint, initial_points, minimum_points, decay, status, revision, created_at, updated_at";
function document(row: ChallengeRow): ChallengeDocument {
  return { id: row.id, title: row.title, category: row.category, difficulty: row.difficulty, description: row.description, connectionInfo: row.connection_info, links: JSON.parse(row.links_json) as DownloadLink[], hint: row.hint, initialPoints: row.initial_points, minimumPoints: row.minimum_points, decay: row.decay, status: row.status, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at };
}
function organizer(viewer: Viewer) {
  if (viewer.role !== "organizer" || !viewer.profileComplete) throw new RequestError(403, "Aksi ini hanya tersedia untuk panitia.");
}
function text(value: unknown, name: string, maximum: number, required = false) {
  if (typeof value !== "string" || value.length > maximum || (required && !value.trim())) throw new RequestError(400, `${name} ${required ? "harus diisi dan " : ""}maksimal ${maximum} karakter.`);
  return value.trim();
}
export function challengeInput(body: Record<string, unknown>) {
  onlyFields(body, ["title", "category", "difficulty", "description", "connectionInfo", "links", "hint", "initialPoints", "minimumPoints", "decay", "status", "flag", "revision"]);
  const title = text(body.title, "Judul", 100, true);
  const description = text(body.description, "Deskripsi", 20000, true);
  const connectionInfo = text(body.connectionInfo ?? "", "Alamat target", 2000);
  const hint = text(body.hint ?? "", "Hint", 4000);
  if (typeof body.category !== "string" || !Object.hasOwn(categoryNames, body.category)) throw new RequestError(400, "Kategori tidak valid.");
  if (typeof body.difficulty !== "string" || !Object.hasOwn(difficultyNames, body.difficulty)) throw new RequestError(400, "Tingkat kesulitan tidak valid.");
  if (!["draft", "published"].includes(String(body.status))) throw new RequestError(400, "Status challenge tidak valid.");
  for (const field of ["initialPoints", "minimumPoints", "decay"]) {
    if (!Number.isSafeInteger(body[field]) || Number(body[field]) < 1 || Number(body[field]) > 100000) throw new RequestError(400, "Poin dan decay harus berupa bilangan bulat 1–100000.");
  }
  if (Number(body.minimumPoints) > Number(body.initialPoints)) throw new RequestError(400, "Poin minimum tidak boleh melebihi poin awal.");
  if (!Array.isArray(body.links) || body.links.length > 10) throw new RequestError(400, "Gunakan maksimal 10 tautan berkas.");
  const links = body.links.map((entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new RequestError(400, "Tautan berkas tidak valid.");
    const item = entry as Record<string, unknown>; onlyFields(item, ["name", "url"]);
    const name = text(item.name, "Nama berkas", 100, true);
    const url = text(item.url, "URL berkas", 2048, true);
    try { const parsed = new URL(url); if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error(); }
    catch { throw new RequestError(400, "Tautan berkas harus menggunakan HTTPS tanpa kredensial pada URL."); }
    return { name, url };
  });
  if (body.flag !== undefined && typeof body.flag !== "string") throw new RequestError(400, "Flag tidak valid.");
  return { title, description, connectionInfo, hint, category: body.category, difficulty: body.difficulty, links, initialPoints: Number(body.initialPoints), minimumPoints: Number(body.minimumPoints), decay: Number(body.decay), status: String(body.status), flag: body.flag as string | undefined, revision: body.revision };
}
export async function getAdminChallenge(database: D1Database, viewer: Viewer, id: string) {
  organizer(viewer);
  const row = await database.prepare(`SELECT ${columns} FROM challenges WHERE id = ?`).bind(id).first<ChallengeRow>();
  return row ? document(row) : null;
}
export async function saveChallenge(database: D1Database, viewer: Viewer, secret: string | undefined, body: Record<string, unknown>, id?: string) {
  organizer(viewer);
  const input = challengeInput(body);
  const challengeId = id || crypto.randomUUID();
  const now = new Date().toISOString();
  const digest = input.flag?.trim() ? await flagDigest(secret, challengeId, input.flag) : null;
  const values = [input.title, input.category, input.difficulty, input.description, input.connectionInfo, JSON.stringify(input.links), input.hint, input.initialPoints, input.minimumPoints, input.decay, input.status];
  if (!id) {
    if (!digest) throw new RequestError(400, "Isi flag untuk challenge baru.");
    const result = await database.prepare(`INSERT INTO challenges (id, title, category, difficulty, description, connection_info, links_json, hint, initial_points, minimum_points, decay, status, flag_digest, created_by, updated_by, created_at, updated_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM "user" WHERE id = ? AND suspended = 0 AND emailVerified = 1)`)
      .bind(challengeId, ...values, digest, viewer.id, viewer.id, now, now, viewer.id).run();
    if (!result.meta.changes) throw new RequestError(403, "Akun tidak dapat menyimpan challenge.");
    return { id: challengeId, revision: 1 };
  }
  if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 1) throw new RequestError(400, "Versi challenge tidak valid. Muat ulang editor.");
  const result = await database.prepare(`UPDATE challenges SET title = ?, category = ?, difficulty = ?, description = ?, connection_info = ?, links_json = ?, hint = ?, initial_points = ?, minimum_points = ?, decay = ?, status = ?, flag_digest = COALESCE(?, flag_digest), updated_by = ?, updated_at = ?, revision = revision + 1
    WHERE id = ? AND revision = ? AND EXISTS (SELECT 1 FROM "user" WHERE id = ? AND suspended = 0 AND emailVerified = 1)
    AND (? != 'draft' OR NOT EXISTS(SELECT 1 FROM solves WHERE challenge_id=challenges.id))`)
    .bind(...values, digest, viewer.id, now, id, Number(input.revision), viewer.id, input.status).run();
  if (!result.meta.changes) throw new RequestError(409, "Challenge berubah atau sudah memiliki solve sehingga tidak dapat dijadikan draft. Muat ulang editor. Hapus challenge untuk menghapusnya beserta solve dan submissions terkait.");
  return { id, revision: Number(input.revision) + 1 };
}
export async function listAdminChallenges(database: D1Database, viewer: Viewer, query: string, status: string, page = 1) {
  organizer(viewer);
  const filter = ["draft", "published"].includes(status) ? status : "";
  const where = "instr(lower(title), ?) > 0 AND (? = '' OR status = ?)";
  const params = [query.toLowerCase().slice(0, 100), filter, filter];
  const [count, rows] = await database.batch([
    database.prepare(`SELECT count(*) AS total FROM challenges WHERE ${where}`).bind(...params),
    database.prepare(`SELECT ${columns} FROM challenges WHERE ${where} ORDER BY updated_at DESC,id LIMIT 50 OFFSET ?`).bind(...params, (page - 1) * 50),
  ]);
  return { total: Number((count.results[0] as { total: number }).total), challenges: (rows.results as ChallengeRow[]).map(document) };
}

export async function deleteChallenge(database: D1Database, viewer: Viewer, id: string, revision: unknown) {
  organizer(viewer);
  if (!Number.isSafeInteger(revision) || Number(revision) < 1) throw new RequestError(400, "Versi challenge tidak valid. Muat ulang editor.");
  const result = await database.prepare(`DELETE FROM challenges WHERE id = ? AND revision = ?
    AND EXISTS (SELECT 1 FROM "user" WHERE id = ? AND suspended = 0 AND profileComplete = 1 AND emailVerified = 1)`)
    .bind(id, Number(revision), viewer.id).run();
  if (!result.meta.changes) throw new RequestError(409, "Challenge berubah atau sudah dihapus. Muat ulang editor.");
}
