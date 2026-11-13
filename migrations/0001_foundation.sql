-- Authentication and gameplay tables will arrive with their respective milestones.
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO platform_settings (key, value) VALUES
  ('platform_name', 'CTF Platform'),
  ('registration_open', 'true'),
  ('schema_version', '1');

CREATE TABLE categories (
  slug TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL UNIQUE
);

INSERT INTO categories (slug, name, description, sort_order) VALUES
  ('web', 'Web', 'Telusuri aplikasi. Temukan celah di balik halaman.', 1),
  ('crypto', 'Crypto', 'Baca pola, bongkar sandi, temukan pesannya.', 2),
  ('forensics', 'Forensics', 'Ikuti jejak yang tertinggal di dalam data.', 3),
  ('reverse', 'Reverse', 'Bongkar program untuk memahami cara kerjanya.', 4),
  ('misc', 'Misc', 'Tantangan lain yang menguji rasa ingin tahu.', 5);
