CREATE TABLE challenges (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES categories(slug),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  description TEXT NOT NULL,
  connection_info TEXT NOT NULL DEFAULT '',
  links_json TEXT NOT NULL DEFAULT '[]',
  hint TEXT NOT NULL DEFAULT '',
  flag_digest TEXT NOT NULL,
  initial_points INTEGER NOT NULL CHECK (initial_points BETWEEN 1 AND 100000),
  minimum_points INTEGER NOT NULL CHECK (minimum_points BETWEEN 1 AND initial_points),
  decay INTEGER NOT NULL CHECK (decay BETWEEN 1 AND 100000),
  status TEXT NOT NULL CHECK (status IN ('draft','published','archived')),
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES "user"(id),
  updated_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX challenges_status_category_idx ON challenges(status, category, created_at);
