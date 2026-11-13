CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  challenge_id TEXT NOT NULL REFERENCES challenges(id),
  result TEXT NOT NULL CHECK (result IN ('correct','incorrect','already_solved')),
  submitted_at TEXT NOT NULL
);
CREATE INDEX submissions_user_time ON submissions(user_id, id DESC);
CREATE INDEX submissions_team_time ON submissions(team_id, id DESC);
CREATE INDEX submissions_challenge_result ON submissions(challenge_id, result, id DESC);
CREATE TABLE solves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL REFERENCES teams(id),
  challenge_id TEXT NOT NULL REFERENCES challenges(id),
  user_id TEXT NOT NULL REFERENCES "user"(id),
  submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id),
  solved_at TEXT NOT NULL,
  UNIQUE(team_id, challenge_id)
);
CREATE INDEX solves_challenge ON solves(challenge_id);
CREATE INDEX solves_user ON solves(user_id, id DESC);
