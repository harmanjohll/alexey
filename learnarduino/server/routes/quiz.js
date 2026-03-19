import { Router } from 'express';

const router = Router();

router.post('/submit', (req, res) => {
  const db = req.app.locals.db;
  const { studentId, moduleId, score, passed } = req.body;

  if (!studentId || !moduleId || score === undefined) {
    return res.status(400).json({ error: 'studentId, moduleId, and score required' });
  }

  // Get attempt number
  const prev = db.prepare(
    'SELECT MAX(attempt) as maxAttempt FROM quiz_scores WHERE student_id = ? AND module_id = ?'
  ).get(studentId, moduleId);
  const attempt = (prev?.maxAttempt || 0) + 1;

  db.prepare(
    'INSERT INTO quiz_scores (student_id, module_id, score, passed, attempt) VALUES (?, ?, ?, ?, ?)'
  ).run(studentId, moduleId, score, passed ? 1 : 0, attempt);

  // If passed, mark module as completed and unlock next
  if (passed) {
    db.prepare(
      'UPDATE progress SET completed = 1, updated_at = CURRENT_TIMESTAMP WHERE student_id = ? AND module_id = ?'
    ).run(studentId, moduleId);

    // Unlock next module
    const moduleNum = parseInt(moduleId.match(/module-(\d+)/)?.[1] || '0');
    if (moduleNum < 10) {
      const nextNum = moduleNum + 1;
      const modules = {
        2: 'module-2-digital-input', 3: 'module-3-analog', 4: 'module-4-pwm',
        5: 'module-5-serial', 6: 'module-6-servo', 7: 'module-7-lcd',
        8: 'module-8-sensors', 9: 'module-9-state-machines', 10: 'module-10-final-project',
      };
      const nextId = modules[nextNum];
      if (nextId) {
        db.prepare(
          'INSERT OR IGNORE INTO progress (student_id, module_id, started) VALUES (?, ?, 1)'
        ).run(studentId, nextId);
      }
    }
  }

  res.json({ attempt, score, passed: !!passed });
});

export default router;
