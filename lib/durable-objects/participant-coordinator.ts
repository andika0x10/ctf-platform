import { DurableObject } from "cloudflare:workers";

/** Foundation for per-participant coordination; flag rate limiting follows in milestone 7. */
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
    `);
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
