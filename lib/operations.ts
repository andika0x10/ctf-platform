import type { Viewer } from "./auth/viewer";
import { resolveRole } from "./auth/viewer";
import { onlyFields, RequestError } from "./http";
import { standingsCTE, type Standing } from "./standings";
function organizer(viewer: Viewer) { if (viewer.role !== "organizer" || !viewer.profileComplete) throw new RequestError(403, "Aksi ini hanya tersedia untuk panitia."); }
function text(value: unknown, label: string, limit: number) { if (typeof value !== "string" || !value.trim() || value.length > limit) throw new RequestError(400, `${label} harus diisi, maksimal ${limit} karakter.`); return value.trim(); }
export async function platformSettings(database: D1Database) {
  const rows = await database.prepare("SELECT key,value FROM platform_settings WHERE key IN ('platform_name','registration_open','rules_markdown')").all<{ key: string; value: string }>();
  const values = Object.fromEntries(rows.results.map(row => [row.key, row.value]));
  return { platformName: values.platform_name || "CTF Platform", registrationOpen: values.registration_open === "true", rules: values.rules_markdown || "" };
}
export async function saveSettings(database: D1Database, viewer: Viewer, body: Record<string, unknown>) {
  organizer(viewer); onlyFields(body, ["platformName", "registrationOpen", "rules"]);
  const name = text(body.platformName, "Nama platform", 24); const rules = text(body.rules, "Aturan", 40000);
  if (typeof body.registrationOpen !== "boolean") throw new RequestError(400, "Pengaturan pendaftaran tidak valid.");
  const now = new Date().toISOString();
  const result = await database.batch([["platform_name", name], ["registration_open", String(body.registrationOpen)], ["rules_markdown", rules]].map(([key, value]) => database.prepare(`INSERT INTO platform_settings(key,value,updated_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM "user" WHERE id=? AND suspended=0 AND emailVerified=1) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(key, value, now, viewer.id)));
  if (!result[0].meta.changes) throw new RequestError(403, "Akun tidak dapat menyimpan pengaturan.");
}
export type Announcement = { id: string; title: string; body: string; status: string; revision: number; createdAt: string; updatedAt: string };
export async function announcements(database: D1Database, page = 1, admin = false) {
  const where = admin ? "" : "WHERE status='published'";
  const [count, rows] = await database.batch([
    database.prepare(`SELECT count(*) AS total FROM announcements ${where}`),
    database.prepare(`SELECT id,title,body,status,revision,created_at AS createdAt,updated_at AS updatedAt FROM announcements ${where} ORDER BY created_at DESC,id LIMIT 20 OFFSET ?`).bind((page - 1) * 20),
  ]);
  return { total: Number((count.results[0] as { total: number }).total), entries: rows.results as Announcement[] };
}
export async function announcement(database: D1Database, viewer: Viewer, id: string) {
  organizer(viewer);
  return database.prepare("SELECT id,title,body,status,revision,created_at AS createdAt,updated_at AS updatedAt FROM announcements WHERE id=?").bind(id).first<Announcement>();
}
export async function saveAnnouncement(database: D1Database, viewer: Viewer, body: Record<string, unknown>, id?: string) {
  organizer(viewer); onlyFields(body, ["title", "body", "status", "revision"]);
  const title = text(body.title, "Judul", 100); const content = text(body.body, "Isi pengumuman", 20000);
  const status = String(body.status); if (!["draft", "published", "archived"].includes(status)) throw new RequestError(400, "Status pengumuman tidak valid.");
  const now = new Date().toISOString(); const target = id || crypto.randomUUID();
  if (id && (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1)) throw new RequestError(400, "Versi pengumuman tidak valid.");
  const result = id
    ? await database.prepare(`UPDATE announcements SET title=?,body=?,status=?,revision=revision+1,updated_by=?,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM "user" WHERE id=? AND suspended=0 AND emailVerified=1)`).bind(title, content, status, viewer.id, now, id, Number(body.revision), viewer.id).run()
    : await database.prepare(`INSERT INTO announcements(id,title,body,status,created_by,updated_by,created_at,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM "user" WHERE id=? AND suspended=0 AND emailVerified=1)`).bind(target, title, content, status, viewer.id, viewer.id, now, now, viewer.id).run();
  if (!result.meta.changes) throw new RequestError(409, "Pengumuman berubah atau tidak tersedia. Muat ulang editor.");
  return { id: target };
}
export async function participants(database: D1Database, allowlist: string[], query = "", page = 1) {
  const search = query.toLowerCase().slice(0, 100);
  const where = "instr(lower(name),?)>0 OR instr(lower(email),?)>0";
  const [count, rows] = await database.batch([
    database.prepare(`SELECT count(*) AS total FROM "user" WHERE ${where}`).bind(search, search),
    database.prepare(`SELECT id,name,email,emailVerified,suspended,profileComplete,createdAt FROM "user" WHERE ${where} ORDER BY createdAt DESC,id LIMIT 50 OFFSET ?`).bind(search, search, (page - 1) * 50),
  ]);
  return { total: Number((count.results[0] as { total: number }).total), entries: (rows.results as { id: string; name: string; email: string; emailVerified: number; suspended: number; profileComplete: number; createdAt: number }[]).map(user => ({ ...user, role: resolveRole(user.email, Boolean(user.emailVerified), allowlist) })) };
}
export async function suspendParticipant(database: D1Database, viewer: Viewer, allowlist: string[], id: string, suspended: unknown) {
  organizer(viewer); if (typeof suspended !== "boolean") throw new RequestError(400, "Status akun tidak valid.");
  const user = await database.prepare('SELECT email,emailVerified FROM "user" WHERE id=?').bind(id).first<{ email: string; emailVerified: number }>();
  if (!user) throw new RequestError(404, "Akun tidak tersedia.");
  if (viewer.id === id || resolveRole(user.email, Boolean(user.emailVerified), allowlist) === "organizer") throw new RequestError(403, "Akun panitia tidak dapat diubah melalui moderasi peserta.");
  const result = await database.batch([
    database.prepare('UPDATE "user" SET suspended=?,updatedAt=? WHERE id=? AND EXISTS(SELECT 1 FROM "user" a WHERE a.id=? AND a.suspended=0 AND a.emailVerified=1)').bind(suspended ? 1 : 0, Date.now(), id, viewer.id),
    database.prepare('DELETE FROM "session" WHERE userId=? AND ?=1 AND EXISTS(SELECT 1 FROM "user" WHERE id=? AND suspended=1)').bind(id, suspended ? 1 : 0, id),
  ]);
  if (!result[0].meta.changes) throw new RequestError(403, "Akun tidak dapat mengubah peserta.");
}
export async function overview(database: D1Database) {
  return database.prepare(`SELECT (SELECT count(*) FROM "user") AS accounts,(SELECT count(*) FROM teams WHERE status='active') AS teams,(SELECT count(*) FROM challenges WHERE status='published') AS challenges,(SELECT count(*) FROM submissions) AS submissions,(SELECT count(*) FROM solves) AS solves`).first<{ accounts: number; teams: number; challenges: number; submissions: number; solves: number }>();
}
export function csvCell(value: unknown) {
  let content = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(content) || /^[\t\r\n]/.test(content)) content = `'${content}`;
  return `"${content.replaceAll('"', '""')}"`;
}
export async function scoreboardCSV(database: D1Database, viewer: Viewer) {
  organizer(viewer);
  const rows = await database.prepare(`${standingsCTE} SELECT * FROM ranked_teams ORDER BY rank LIMIT 10001`).all<Standing>();
  if (rows.results.length > 10000) throw new RequestError(409, "Ekspor melebihi batas 10.000 tim. Hubungi pengelola untuk ekspor database.");
  return "\uFEFF" + [["Peringkat", "Tim", "Status", "Skor", "Solve", "Solve terakhir (UTC)"], ...rows.results.map(row => [row.rank, row.name, row.status, row.score, row.solveCount, row.lastSolveAt])].map(row => row.map(csvCell).join(",")).join("\r\n");
}
