CREATE TABLE teams (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  owner_user_id TEXT NOT NULL REFERENCES "user"(id),
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  last_operation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE UNIQUE INDEX teams_active_owner_idx ON teams(owner_user_id) WHERE status = 'active';

CREATE TABLE team_members (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES "user"(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  membership_id TEXT NOT NULL UNIQUE,
  joined_at TEXT NOT NULL
);
CREATE INDEX team_members_team_idx ON team_members(team_id, joined_at);

CREATE TABLE team_events (
  id TEXT PRIMARY KEY NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id),
  actor_user_id TEXT NOT NULL REFERENCES "user"(id),
  subject_user_id TEXT REFERENCES "user"(id),
  kind TEXT NOT NULL CHECK (kind IN ('created', 'joined', 'renamed', 'invite_rotated', 'removed', 'ownership_transferred', 'left', 'archived')),
  created_at TEXT NOT NULL
);
CREATE INDEX team_events_team_idx ON team_events(team_id, created_at DESC);

CREATE TRIGGER team_members_active_insert
BEFORE INSERT ON team_members
WHEN NOT EXISTS (SELECT 1 FROM teams WHERE id = NEW.team_id AND status = 'active')
BEGIN
  SELECT RAISE(ABORT, 'team_not_active');
END;

CREATE TRIGGER team_members_keep_owner
BEFORE DELETE ON team_members
WHEN EXISTS (SELECT 1 FROM teams WHERE id = OLD.team_id AND status = 'active' AND owner_user_id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'owner_must_transfer');
END;

CREATE TRIGGER teams_owner_is_member
BEFORE UPDATE OF owner_user_id ON teams
WHEN NEW.status = 'active' AND NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = NEW.id AND user_id = NEW.owner_user_id)
BEGIN
  SELECT RAISE(ABORT, 'owner_must_be_member');
END;
