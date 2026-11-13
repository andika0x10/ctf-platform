import { DurableObject } from "cloudflare:workers";

/** One object per participant. SQLite transactions serialize attempts across requests. */
export class ParticipantCoordinator extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS coordinator_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        schema_version INTEGER NOT NULL,
        initialized_at TEXT NOT NULL
      );
      INSERT OR IGNORE INTO coordinator_metadata (id, schema_version, initialized_at)
      VALUES (1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
      CREATE TABLE IF NOT EXISTS attempt_windows (
        challenge_id TEXT PRIMARY KEY,
        window_started INTEGER NOT NULL,
        attempts INTEGER NOT NULL
      );
    `);
  }

  consume(challengeId: string) {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(challengeId)) throw new Error("Invalid challenge ID");
    return this.ctx.storage.transactionSync(() => {
      const now = Date.now();
      this.ctx.storage.sql.exec("DELETE FROM attempt_windows WHERE window_started <= ?", now - 60000);
      const row = this.ctx.storage.sql.exec<{ window_started: number; attempts: number }>("SELECT window_started,attempts FROM attempt_windows WHERE challenge_id=?", challengeId).toArray()[0];
      if (row && row.attempts >= 10) return { allowed: false, retryAfter: Math.max(1, Math.ceil((row.window_started + 60000 - now) / 1000)) };
      this.ctx.storage.sql.exec("INSERT INTO attempt_windows(challenge_id,window_started,attempts) VALUES(?,?,1) ON CONFLICT(challenge_id) DO UPDATE SET attempts=attempts+1", challengeId, now);
      return { allowed: true, retryAfter: 0 };
    });
  }

  getStatus() {
    const row = this.ctx.storage.sql.exec<{
      schema_version: number;
      initialized_at: string;
    }>("SELECT schema_version, initialized_at FROM coordinator_metadata WHERE id = 1").one();

    return {
      storage: "sqlite" as const,
      schemaVersion: row.schema_version,
      initializedAt: row.initialized_at,
    };
  }
}
