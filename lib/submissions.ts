import type { Viewer } from "./auth/viewer";
import { RequestError } from "./http";
import { normalizeFlag, verifyFlag } from "./flags";
import { challengeScore } from "./scoring";
export type SubmissionResult = "correct" | "incorrect" | "already_solved";
export type AttemptLimiter = { consume(id: string): Promise<{ allowed: boolean; retryAfter: number }> };
export class AttemptLimitError extends RequestError {
  constructor(public retryAfter: number) { super(429, `Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.`); }
}
export async function submitFlag(database: D1Database, viewer: Viewer, secret: string | undefined, limiter: AttemptLimiter, challengeId: string, input: unknown) {
  if (viewer.role !== "participant" || !viewer.profileComplete) throw new RequestError(403, "Submit flag hanya tersedia untuk peserta yang sudah melengkapi profil.");
  const flag = normalizeFlag(input);
  const challenge = await database.prepare("SELECT flag_digest,revision FROM challenges WHERE id=? AND status='published'").bind(challengeId).first<{ flag_digest: string; revision: number }>();
  if (!challenge) throw new RequestError(404, "Challenge tidak tersedia.");
  const member = await database.prepare("SELECT m.team_id,m.membership_id FROM team_members m JOIN teams t ON t.id=m.team_id AND t.status='active' WHERE m.user_id=?").bind(viewer.id).first<{ team_id: string; membership_id: string }>();
  if (!member) throw new RequestError(403, "Buat atau gabung tim sebelum submit flag.");
  const limit = await limiter.consume(challengeId);
  if (!limit.allowed) throw new AttemptLimitError(limit.retryAfter);
  const valid = await verifyFlag(secret, challengeId, flag, challenge.flag_digest);
  const operation = crypto.randomUUID(); const now = new Date().toISOString();
  const results = await database.batch([
    database.prepare(`INSERT INTO submissions(operation_id,user_id,team_id,challenge_id,result,submitted_at)
      SELECT ?,?,?,?,CASE WHEN EXISTS(SELECT 1 FROM solves WHERE team_id=? AND challenge_id=?) THEN 'already_solved' ELSE ? END,?
      WHERE EXISTS(SELECT 1 FROM team_members m JOIN teams t ON t.id=m.team_id JOIN "user" u ON u.id=m.user_id
        WHERE m.user_id=? AND m.team_id=? AND m.membership_id=? AND t.status='active' AND u.suspended=0 AND u.emailVerified=1 AND u.profileComplete=1)
      AND EXISTS(SELECT 1 FROM challenges WHERE id=? AND revision=? AND status='published')`)
      .bind(operation, viewer.id, member.team_id, challengeId, member.team_id, challengeId, valid ? "correct" : "incorrect", now, viewer.id, member.team_id, member.membership_id, challengeId, challenge.revision),
    database.prepare(`INSERT INTO solves(team_id,challenge_id,user_id,submission_id,solved_at)
      SELECT team_id,challenge_id,user_id,id,submitted_at FROM submissions WHERE operation_id=? AND result='correct'
      ON CONFLICT(team_id,challenge_id) DO NOTHING`).bind(operation),
    database.prepare(`UPDATE submissions SET result='already_solved' WHERE operation_id=? AND result='correct'
      AND NOT EXISTS(SELECT 1 FROM solves WHERE submission_id=submissions.id)`).bind(operation),
    database.prepare("SELECT result,team_id AS teamId FROM submissions WHERE operation_id=?").bind(operation),
  ]);
  const row = results[3].results[0] as { result: SubmissionResult; teamId: string } | undefined;
  if (!row) throw new RequestError(409, "Tim atau challenge berubah. Muat ulang halaman sebelum mencoba lagi.");
  return { ...row, score: await challengeScore(database, challengeId, row.teamId) };
}
