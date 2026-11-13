import { scoreCTE } from "./scoring";
export type Standing = { id: string; name: string; status: string; score: number; solveCount: number; lastSolveAt: string | null; rank: number };
export const standingsCTE = `${scoreCTE}, team_scores AS (
  SELECT t.id,t.name,t.status,COALESCE(sum(v.points),0) AS score,count(s.id) AS solveCount,max(s.solved_at) AS lastSolveAt
  FROM teams t LEFT JOIN solves s ON s.team_id=t.id LEFT JOIN challenge_values v ON v.id=s.challenge_id GROUP BY t.id
), ranked_teams AS (
  SELECT *,row_number() OVER(ORDER BY score DESC,lastSolveAt ASC,id ASC) AS rank FROM team_scores
)`;
export async function standings(database: D1Database, page = 1) {
  const rows = await database.batch([
    database.prepare("SELECT count(*) AS total FROM teams"),
    database.prepare(`${standingsCTE} SELECT * FROM ranked_teams ORDER BY rank LIMIT 50 OFFSET ?`).bind((page - 1) * 50),
  ]);
  return { total: Number((rows[0].results[0] as { total: number }).total), teams: rows[1].results as Standing[] };
}
export async function publicTeam(database: D1Database, id: string, page = 1) {
  const standing = await database.prepare(`${standingsCTE} SELECT * FROM ranked_teams WHERE id=?`).bind(id).first<Standing>();
  if (!standing) return null;
  const [members, solves] = await database.batch([
    database.prepare('SELECT u.name FROM team_members m JOIN "user" u ON u.id=m.user_id WHERE m.team_id=? ORDER BY m.joined_at,u.id').bind(id),
    database.prepare(`${scoreCTE} SELECT c.id,c.title,c.category,c.status,v.points,s.solved_at AS solvedAt,u.name AS solverName
      FROM solves s JOIN challenges c ON c.id=s.challenge_id JOIN challenge_values v ON v.id=c.id JOIN "user" u ON u.id=s.user_id
      WHERE s.team_id=? ORDER BY s.id DESC LIMIT 50 OFFSET ?`).bind(id, (page - 1) * 50),
  ]);
  return { ...standing, members: members.results as { name: string }[], solves: solves.results as { id: string; title: string; category: string; status: string; points: number; solvedAt: string; solverName: string }[] };
}
export type HistoryEntry = { id: number; challengeId: string; title: string; teamId: string; teamName: string; userName: string; result: string; submittedAt: string };
export async function submissionHistory(database: D1Database, filter: { userId?: string; teamId?: string; challengeId?: string; result?: string; search?: string }, page = 1) {
  const conditions: string[] = []; const params: string[] = [];
  for (const [field, column] of [["userId", "s.user_id"], ["teamId", "s.team_id"], ["challengeId", "s.challenge_id"], ["result", "s.result"]] as const) {
    if (filter[field]) { conditions.push(`${column}=?`); params.push(filter[field]!); }
  }
  if (filter.search) { conditions.push(`(s.challenge_id IN(SELECT id FROM challenges WHERE instr(lower(title),?)>0) OR s.team_id IN(SELECT id FROM teams WHERE instr(lower(name),?)>0) OR s.user_id IN(SELECT id FROM "user" WHERE instr(lower(name),?)>0))`); const query = filter.search.toLowerCase().slice(0, 100); params.push(query, query, query); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [count, entries] = await database.batch([
    database.prepare(`SELECT count(*) AS total FROM submissions s ${where}`).bind(...params),
    database.prepare(`SELECT s.id,c.id AS challengeId,c.title,t.id AS teamId,t.name AS teamName,u.name AS userName,s.result,s.submitted_at AS submittedAt
      FROM submissions s JOIN challenges c ON c.id=s.challenge_id JOIN teams t ON t.id=s.team_id JOIN "user" u ON u.id=s.user_id ${where} ORDER BY s.id DESC LIMIT 50 OFFSET ?`).bind(...params, (page - 1) * 50),
  ]);
  return { total: Number((count.results[0] as { total: number }).total), entries: entries.results as HistoryEntry[] };
}
