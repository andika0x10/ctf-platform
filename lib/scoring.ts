/** ceil(initial - reduction); integer arithmetic mirrors the authoritative SQL. */
export function dynamicPoints(initial: number, minimum: number, decay: number, solves: number) {
  if (solves >= decay) return minimum;
  return initial - Math.floor(((initial - minimum) * solves * solves) / (decay * decay));
}
export const scoreCTE = `WITH solve_counts AS (
  SELECT challenge_id,count(*) AS n FROM solves GROUP BY challenge_id
), challenge_values AS (
  SELECT c.id,COALESCE(sc.n,0) AS solve_count,
    CASE WHEN COALESCE(sc.n,0)>=c.decay THEN c.minimum_points
      ELSE c.initial_points-CAST(((c.initial_points-c.minimum_points)*COALESCE(sc.n,0)*COALESCE(sc.n,0))/(c.decay*c.decay) AS INTEGER) END AS points
  FROM challenges c LEFT JOIN solve_counts sc ON sc.challenge_id=c.id
)`;
export async function challengeScore(database: D1Database, id: string, teamId?: string) {
  const row = await database.prepare(`${scoreCTE} SELECT points,solve_count AS solveCount,EXISTS(SELECT 1 FROM solves WHERE challenge_id=? AND team_id=?) AS solved FROM challenge_values WHERE id=?`).bind(id, teamId || "", id).first<{ points: number; solveCount: number; solved: number }>();
  return row ? { ...row, solved: Boolean(row.solved) } : null;
}
