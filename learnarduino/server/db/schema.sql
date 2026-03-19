CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  started INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, module_id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS quiz_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  attempt INTEGER NOT NULL DEFAULT 1,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Seed Alexey's profile
INSERT OR IGNORE INTO students (id, name) VALUES ('alexey', 'Alexey Mikhail Johll');

-- Auto-start Module 1
INSERT OR IGNORE INTO progress (student_id, module_id, started) VALUES ('alexey', 'module-1-blink', 1);
