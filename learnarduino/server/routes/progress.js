import { Router } from 'express';

const router = Router();

router.get('/:studentId', (req, res) => {
  const db = req.app.locals.db;
  const { studentId } = req.params;

  const rows = db.prepare('SELECT * FROM progress WHERE student_id = ?').all(studentId);
  const result = {};
  for (const row of rows) {
    result[row.module_id] = {
      started: !!row.started,
      completed: !!row.completed,
      timeSpent: row.time_spent_seconds,
    };
  }

  res.json(result);
});

router.post('/:studentId', (req, res) => {
  const db = req.app.locals.db;
  const { studentId } = req.params;
  const { moduleId, started, completed, timeSpent } = req.body;

  if (!moduleId) {
    return res.status(400).json({ error: 'moduleId required' });
  }

  const stmt = db.prepare(`
    INSERT INTO progress (student_id, module_id, started, completed, time_spent_seconds, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(student_id, module_id)
    DO UPDATE SET
      started = COALESCE(?, started),
      completed = COALESCE(?, completed),
      time_spent_seconds = COALESCE(?, time_spent_seconds),
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(
    studentId, moduleId,
    started ? 1 : 0, completed ? 1 : 0, timeSpent || 0,
    started !== undefined ? (started ? 1 : 0) : null,
    completed !== undefined ? (completed ? 1 : 0) : null,
    timeSpent || null
  );

  res.json({ moduleId, started: !!started, completed: !!completed, timeSpent: timeSpent || 0 });
});

export default router;
