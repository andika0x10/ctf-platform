import { RequestError } from "./http";
import type { DownloadLink } from "./challenge-types";

export type PlayableChallenge = { id: string; title: string; category: string; difficulty: string; description: string; connectionInfo: string; links: DownloadLink[]; hasHint: boolean; points: number };
type Row = { id: string; title: string; category: string; difficulty: string; description: string; connection_info: string; links_json: string; has_hint: number; initial_points: number };
export async function getPlayableChallenge(database: D1Database, id: string): Promise<PlayableChallenge | null> {
  const row = await database.prepare("SELECT id,title,category,difficulty,description,connection_info,links_json,(length(hint)>0) AS has_hint,initial_points FROM challenges WHERE id=? AND status='published'").bind(id).first<Row>();
  if (!row) return null;
  return { id: row.id, title: row.title, category: row.category, difficulty: row.difficulty, description: row.description, connectionInfo: row.connection_info, links: JSON.parse(row.links_json), hasHint: Boolean(row.has_hint), points: row.initial_points };
}
export async function listPlayableChallenges(database: D1Database, query = "", category = "", page = 1) {
  const filter = "status='published' AND instr(lower(title),?)>0 AND (?='' OR category=?)";
  const params = [query.toLowerCase().slice(0, 100), category.slice(0, 30), category.slice(0, 30)];
  const results = await database.batch([
    database.prepare(`SELECT count(*) AS total FROM challenges WHERE ${filter}`).bind(...params),
    database.prepare(`SELECT id,title,category,difficulty,initial_points AS points FROM challenges WHERE ${filter} ORDER BY created_at DESC,id LIMIT 50 OFFSET ?`).bind(...params, (page - 1) * 50),
  ]);
  return { total: Number((results[0].results[0] as { total: number }).total), challenges: results[1].results as { id: string; title: string; category: string; difficulty: string; points: number }[] };
}
export async function revealHint(database: D1Database, id: string) {
  const row = await database.prepare("SELECT hint FROM challenges WHERE id=? AND status='published'").bind(id).first<{ hint: string }>();
  if (!row) throw new RequestError(404, "Challenge tidak tersedia.");
  return row.hint;
}
export function pageNumber(value: unknown) { return Math.min(10000, Math.max(1, Number.parseInt(typeof value === "string" ? value : "1", 10) || 1)); }
