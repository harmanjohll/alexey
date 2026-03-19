/**
 * Build Content Script
 * Parses /content directory into a JSON manifest at build time.
 * Run: node scripts/build-content.js
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const contentDir = join(__dirname, '..', 'content');

const modules = [];

const dirs = readdirSync(contentDir).filter(d => d.startsWith('module-')).sort();

for (const dir of dirs) {
  const lessonPath = join(contentDir, dir, 'lesson.md');
  const quizPath = join(contentDir, dir, 'quiz.json');

  const entry = { id: dir };

  if (existsSync(lessonPath)) {
    const raw = readFileSync(lessonPath, 'utf-8');
    const { data } = matter(raw);
    entry.title = data.title || dir;
    entry.description = data.description || '';
    entry.order = data.order || 0;
    entry.tags = data.tags || [];
  }

  if (existsSync(quizPath)) {
    const quiz = JSON.parse(readFileSync(quizPath, 'utf-8'));
    entry.questionCount = quiz.questions?.length || 0;
  }

  modules.push(entry);
}

const manifest = { modules, generatedAt: new Date().toISOString() };
const outPath = join(contentDir, 'manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2));

console.log(`Generated manifest with ${modules.length} modules → ${outPath}`);
