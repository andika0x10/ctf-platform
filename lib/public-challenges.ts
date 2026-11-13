import { RequestError } from "./http";
import type { DownloadLink } from "./challenge-types";
import { challengeScore, scoreCTE } from "./scoring";

export type PlayableChallenge = { id: string; title: string; category: string; difficulty: string; description: string; connectionInfo: string; links: DownloadLink[]; hasHint: boolean; points: number; solveCount: number; solved: boolean };
type Row = { id: string; title: string; category: string; difficulty: string; description: string; connection_info: string; links_json: string; has_hint: number; initial_points: number };
export async function getPlayableChallenge(database: D1Database, id: string, teamId?: string): Promise<PlayableChallenge | null> {
  const row = await database.prepare("SELECT id,title,category,difficulty,description,connection_info,links_json,(length(hint)>0) AS has_hint,initial_points FROM challenges WHERE id=? AND status='published'").bind(id).first<Row>();
  if (!row) return null;
  const score = await challengeScore(database, id, teamId);
  return { id: row.id, title: row.title, category: row.category, difficulty: row.difficulty, description: row.description, connectionInfo: row.connection_info, links: JSON.parse(row.links_json), hasHint: Boolean(row.has_hint), points: score!.points, solveCount: score!.solveCount, solved: score!.solved };
}
export async function listPlayableChallenges(database: D1Database, query = "", category = "", page = 1, teamId = "", solved = "") {
  const state = ["solved", "unsolved"].includes(solved) ? solved : "";
  const filter = "c.status='published' AND instr(lower(c.title),?)>0 AND (?='' OR c.category=?) AND (?='' OR EXISTS(SELECT 1 FROM solves s WHERE s.challenge_id=c.id AND s.team_id=?)=?)";
  const params = [query.toLowerCase().slice(0, 100), category.slice(0, 30), category.slice(0, 30), state, teamId, state === "solved" ? 1 : 0];
  const results = await database.batch([
    database.prepare(`SELECT count(*) AS total FROM challenges c WHERE ${filter}`).bind(...params),
    database.prepare(`${scoreCTE} SELECT c.id,c.title,c.category,c.difficulty,v.points,v.solve_count AS solveCount,EXISTS(SELECT 1 FROM solves WHERE challenge_id=c.id AND team_id=?) AS solved FROM challenges c JOIN challenge_values v ON v.id=c.id WHERE ${filter} ORDER BY c.created_at DESC,c.id LIMIT 50 OFFSET ?`).bind(teamId, ...params, (page - 1) * 50),
  ]);
  return { total: Number((results[0].results[0] as { total: number }).total), challenges: results[1].results as { id: string; title: string; category: string; difficulty: string; points: number; solveCount: number; solved: number }[] };
}
export async function revealHint(database: D1Database, id: string) {
  const row = await database.prepare("SELECT hint FROM challenges WHERE id=? AND status='published'").bind(id).first<{ hint: string }>();
  if (!row) throw new RequestError(404, "Challenge tidak tersedia.");
  return row.hint;
}
export function pageNumber(value: unknown) { return Math.min(10000, Math.max(1, Number.parseInt(typeof value === "string" ? value : "1", 10) || 1)); }
