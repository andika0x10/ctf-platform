import type { Viewer } from "./auth/viewer";
import { RequestError } from "./http";
import { displayName, invitationCode } from "./validation";

type TeamRow = {
  id: string; name: string; owner_user_id: string; invite_code: string;
  status: "active" | "archived"; created_at: string; updated_at: string; archived_at: string | null;
};
export type TeamMember = { id: string; name: string; joinedAt: string };
export type TeamEvent = { id: string; kind: string; actorName: string; subjectName: string | null; createdAt: string };
export type TeamDetails = {
  id: string; name: string; ownerUserId: string; status: "active" | "archived";
  createdAt: string; updatedAt: string; archivedAt: string | null;
  inviteCode?: string; members: TeamMember[]; events: TeamEvent[];
};
export type TeamAction =
  | { action: "rename"; name: string }
  | { action: "rotate-invite" | "leave" | "archive" }
  | { action: "remove-member" | "transfer-owner"; userId: string };

function newInvitationCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}
function participant(viewer: Viewer) {
  if (viewer.role !== "participant") throw new RequestError(403, "Aksi ini tersedia untuk akun peserta.");
  if (!viewer.profileComplete) throw new RequestError(403, "Simpan nama tampilanmu terlebih dahulu.");
}
async function batch(database: D1Database, statements: D1PreparedStatement[]) {
  try { return await database.batch(statements); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("teams.name_key")) throw new RequestError(409, "Nama tim sudah digunakan. Pilih nama lain.");
    if (message.includes("team_members.user_id") || message.includes("teams.owner_user_id")) throw new RequestError(409, "Kamu sudah memiliki tim. Keluar dari tim saat ini sebelum bergabung lagi.");
    if (message.includes("owner_must_transfer")) throw new RequestError(409, "Alihkan kepemilikan sebelum keluar atau mengeluarkan pemilik tim.");
    if (message.includes("owner_must_be_member") || message.includes("team_not_active")) throw new RequestError(409, "Keanggotaan tim berubah. Muat ulang halaman dan coba lagi.");
    throw error;
  }
}

export async function getTeamDetails(database: D1Database, id: string, viewer: Viewer): Promise<TeamDetails | null> {
  const team = await database.prepare(`SELECT t.* FROM teams t WHERE t.id = ? AND
    (? = 1 OR EXISTS (SELECT 1 FROM team_members m WHERE m.team_id = t.id AND m.user_id = ?))`)
    .bind(id, viewer.role === "organizer" ? 1 : 0, viewer.id).first<TeamRow>();
  if (!team) return null;
  const [members, events] = await database.batch([
    database.prepare(`SELECT u.id, u.name, m.joined_at AS joinedAt FROM team_members m
      JOIN "user" u ON u.id = m.user_id WHERE m.team_id = ? ORDER BY m.joined_at, u.id`).bind(id),
    database.prepare(`SELECT e.id, e.kind, a.name AS actorName, s.name AS subjectName, e.created_at AS createdAt
      FROM team_events e JOIN "user" a ON a.id = e.actor_user_id LEFT JOIN "user" s ON s.id = e.subject_user_id
      WHERE e.team_id = ? ORDER BY e.created_at DESC, e.id DESC LIMIT 20`).bind(id),
  ]);
  return {
    id: team.id, name: team.name, ownerUserId: team.owner_user_id, status: team.status,
    createdAt: team.created_at, updatedAt: team.updated_at, archivedAt: team.archived_at,
    ...(viewer.role === "organizer" || viewer.id === team.owner_user_id ? { inviteCode: team.invite_code } : {}),
    members: members.results as TeamMember[], events: events.results as TeamEvent[],
  };
}

export async function getCurrentTeam(database: D1Database, viewer: Viewer) {
  const member = await database.prepare("SELECT team_id FROM team_members WHERE user_id = ?").bind(viewer.id).first<{ team_id: string }>();
  return member ? getTeamDetails(database, member.team_id, viewer) : null;
}

export async function createTeam(database: D1Database, viewer: Viewer, input: unknown) {
  participant(viewer);
  const name = displayName(input, "team");
  const id = crypto.randomUUID();
  const membership = crypto.randomUUID();
  const operation = crypto.randomUUID();
  const now = new Date().toISOString();
  const result = await batch(database, [
    database.prepare(`INSERT INTO teams (id, name, name_key, owner_user_id, invite_code, last_operation_id, created_at, updated_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE user_id = ?)
      AND EXISTS (SELECT 1 FROM "user" WHERE id = ? AND suspended = 0 AND profileComplete = 1 AND emailVerified = 1)`)
      .bind(id, name, name.toLowerCase(), viewer.id, newInvitationCode(), operation, now, now, viewer.id, viewer.id),
    database.prepare(`INSERT INTO team_members (user_id, team_id, membership_id, joined_at)
      SELECT ?, id, ?, ? FROM teams WHERE id = ? AND last_operation_id = ?`).bind(viewer.id, membership, now, id, operation),
    database.prepare(`INSERT INTO team_events (id, team_id, actor_user_id, kind, created_at)
      SELECT ?, id, ?, 'created', ? FROM teams WHERE id = ? AND last_operation_id = ?`).bind(operation, viewer.id, now, id, operation),
  ]);
  if (!result[0].meta.changes) throw new RequestError(409, "Kamu sudah memiliki tim atau akunmu tidak dapat membuat tim.");
  return id;
}

export async function joinTeam(database: D1Database, viewer: Viewer, input: unknown) {
  participant(viewer);
  const code = invitationCode(input);
  const membership = crypto.randomUUID();
  const now = new Date().toISOString();
  const result = await batch(database, [
    database.prepare(`INSERT INTO team_members (user_id, team_id, membership_id, joined_at)
      SELECT ?, t.id, ?, ? FROM teams t WHERE t.invite_code = ? AND t.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM team_members WHERE user_id = ?)
      AND EXISTS (SELECT 1 FROM "user" WHERE id = ? AND suspended = 0 AND profileComplete = 1 AND emailVerified = 1)`)
      .bind(viewer.id, membership, now, code, viewer.id, viewer.id),
    database.prepare(`INSERT INTO team_events (id, team_id, actor_user_id, kind, created_at)
      SELECT ?, team_id, ?, 'joined', ? FROM team_members WHERE membership_id = ?`).bind(crypto.randomUUID(), viewer.id, now, membership),
  ]);
  if (!result[0].meta.changes) {
    if (await getCurrentTeam(database, viewer)) throw new RequestError(409, "Kamu sudah memiliki tim. Keluar dari tim saat ini terlebih dahulu.");
    throw new RequestError(404, "Kode tim tidak berlaku. Minta kode terbaru dari pemilik tim.");
  }
  return (await database.prepare("SELECT team_id FROM team_members WHERE membership_id = ?").bind(membership).first<{ team_id: string }>())?.team_id;
}

export async function updateTeam(database: D1Database, viewer: Viewer, id: string, action: TeamAction) {
  if (!viewer.profileComplete) throw new RequestError(403, "Simpan nama tampilanmu terlebih dahulu.");
  const team = await getTeamDetails(database, id, viewer);
  if (!team) throw new RequestError(403, "Kamu tidak memiliki akses ke tim ini.");
  if (team.status !== "active") throw new RequestError(409, "Tim ini sudah diarsipkan.");
  const organizer = viewer.role === "organizer";
  const owner = team.ownerUserId === viewer.id;
  if (action.action === "leave") {
    participant(viewer);
    if (owner) throw new RequestError(409, "Alihkan kepemilikan sebelum keluar. Jika kamu anggota terakhir, arsipkan tim.");
  } else if (!organizer && !owner) throw new RequestError(403, "Hanya pemilik tim atau panitia yang dapat melakukan aksi ini.");

  const operation = crypto.randomUUID();
  const now = new Date().toISOString();
  const updates = ["updated_at = ?", "last_operation_id = ?"];
  const values: (string | number)[] = [now, operation];
  let condition = "(? = 1 OR owner_user_id = ?)";
  const conditions: (string | number)[] = [organizer ? 1 : 0, viewer.id];
  let kind: string;
  let subject: string | null = null;

  switch (action.action) {
    case "rename": {
      const name = displayName(action.name, "team");
      updates.push("name = ?", "name_key = ?"); values.push(name, name.toLowerCase()); kind = "renamed";
      break;
    }
    case "rotate-invite": updates.push("invite_code = ?"); values.push(newInvitationCode()); kind = "invite_rotated"; break;
    case "transfer-owner":
      if (action.userId === team.ownerUserId) throw new RequestError(400, "Peserta ini sudah menjadi pemilik tim.");
      updates.push("owner_user_id = ?"); values.push(action.userId); subject = action.userId; kind = "ownership_transferred";
      condition += ' AND EXISTS (SELECT 1 FROM team_members m JOIN "user" u ON u.id = m.user_id WHERE m.team_id = teams.id AND m.user_id = ? AND u.suspended = 0)';
      conditions.push(action.userId); break;
    case "remove-member":
      if (action.userId === team.ownerUserId) throw new RequestError(409, "Alihkan kepemilikan sebelum mengeluarkan pemilik tim.");
      subject = action.userId; kind = "removed";
      condition += " AND EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = ? AND user_id <> teams.owner_user_id)";
      conditions.push(action.userId); break;
    case "leave":
      kind = "left"; subject = viewer.id;
      condition = "owner_user_id <> ? AND EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = ?)";
      conditions.splice(0, conditions.length, viewer.id, viewer.id); break;
    case "archive":
      if (!organizer && team.members.length !== 1) throw new RequestError(409, "Tim masih memiliki anggota lain. Alihkan kepemilikan jika kamu ingin keluar.");
      updates.push("status = 'archived'", "archived_at = ?"); values.push(now); kind = "archived";
      condition += " AND (? = 1 OR (SELECT COUNT(*) FROM team_members WHERE team_id = teams.id) = 1)";
      conditions.push(organizer ? 1 : 0); break;
  }

  // The operation marker couples every write to authorization rechecked in the SAME transaction.
  // No read/modify/write state is split between D1 and a Durable Object.
  const statements = [database.prepare(`UPDATE teams SET ${updates.join(", ")} WHERE id = ? AND status = 'active' AND ${condition}
    AND EXISTS (SELECT 1 FROM "user" WHERE id = ? AND suspended = 0 AND profileComplete = 1 AND emailVerified = 1)`)
    .bind(...values, id, ...conditions, viewer.id)];
  if (action.action === "leave" || action.action === "remove-member") {
    statements.push(database.prepare(`DELETE FROM team_members WHERE team_id = ? AND user_id = ?
      AND EXISTS (SELECT 1 FROM teams WHERE id = ? AND last_operation_id = ?)`)
      .bind(id, subject, id, operation));
  } else if (action.action === "archive") {
    statements.push(database.prepare(`DELETE FROM team_members WHERE team_id = ?
      AND EXISTS (SELECT 1 FROM teams WHERE id = ? AND last_operation_id = ? AND status = 'archived')`).bind(id, id, operation));
  }
  statements.push(database.prepare(`INSERT INTO team_events (id, team_id, actor_user_id, subject_user_id, kind, created_at)
    SELECT ?, id, ?, ?, ?, ? FROM teams WHERE id = ? AND last_operation_id = ?`).bind(operation, viewer.id, subject, kind, now, id, operation));
  const result = await batch(database, statements);
  if (!result[0].meta.changes) throw new RequestError(409, "Keanggotaan atau akses tim berubah. Muat ulang halaman dan coba lagi.");
}

export async function listTeams(database: D1Database, query: string, page: number) {
  const search = query.normalize("NFKC").trim().toLowerCase().slice(0, 100);
  const [rows, count] = await database.batch([
    database.prepare(`SELECT t.id, t.name, t.status, t.updated_at AS updatedAt, u.name AS ownerName,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS memberCount FROM teams t
      JOIN "user" u ON u.id = t.owner_user_id WHERE instr(t.name_key, ?) > 0 ORDER BY t.created_at DESC, t.id LIMIT 50 OFFSET ?`).bind(search, (page - 1) * 50),
    database.prepare("SELECT COUNT(*) AS total FROM teams WHERE instr(name_key, ?) > 0").bind(search),
  ]);
  return {
    teams: rows.results as { id: string; name: string; status: string; ownerName: string; memberCount: number; updatedAt: string }[],
    total: (count.results[0] as { total: number }).total,
  };
}
