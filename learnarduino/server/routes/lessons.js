import { Router } from 'express';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const router = Router();

router.get('/', (req, res) => {
  const contentDir = req.app.locals.contentDir;
  const modules = [];

  try {
    const dirs = readdirSync(contentDir).filter(d => d.startsWith('module-')).sort();
    for (const dir of dirs) {
      const lessonPath = join(contentDir, dir, 'lesson.md');
      if (existsSync(lessonPath)) {
        const raw = readFileSync(lessonPath, 'utf-8');
        const { data } = matter(raw);
        modules.push({
          id: dir,
          title: data.title || dir,
          description: data.description || '',
          tags: data.tags || [],
          order: data.order || 0,
        });
      } else {
        modules.push({ id: dir, title: dir, description: 'Coming soon', tags: [], order: 99 });
      }
    }
  } catch (e) {
    console.error('Error reading lessons:', e);
  }

  res.json(modules);
});

router.get('/:id', (req, res) => {
  const contentDir = req.app.locals.contentDir;
  const moduleDir = join(contentDir, req.params.id);

  if (!existsSync(moduleDir)) {
    return res.status(404).json({ error: 'Module not found' });
  }

  const lessonPath = join(moduleDir, 'lesson.md');
  const starterPath = join(moduleDir, 'starter.ino');
  const circuitPath = join(moduleDir, 'circuit.svg');
  const quizPath = join(moduleDir, 'quiz.json');

  let content = '', title = '', starterCode = '', circuitSvg = null, quiz = null;

  if (existsSync(lessonPath)) {
    const raw = readFileSync(lessonPath, 'utf-8');
    const parsed = matter(raw);
    content = parsed.content;
    title = parsed.data.title || req.params.id;
  }

  if (existsSync(starterPath)) {
    starterCode = readFileSync(starterPath, 'utf-8');
  }

  if (existsSync(circuitPath)) {
    circuitSvg = readFileSync(circuitPath, 'utf-8');
  }

  if (existsSync(quizPath)) {
    quiz = JSON.parse(readFileSync(quizPath, 'utf-8'));
  }

  // Never send solution.ino to client
  res.json({ id: req.params.id, title, content, starterCode, circuitSvg, quiz });
});

export default router;
