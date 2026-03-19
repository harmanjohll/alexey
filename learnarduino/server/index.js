import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import lessonsRouter from './routes/lessons.js';
import progressRouter from './routes/progress.js';
import quizRouter from './routes/quiz.js';
import compileRouter from './routes/compile.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const dbPath = join(__dirname, 'db', 'arduinolab.sqlite');
const db = new Database(dbPath);

// Run schema
const schemaPath = join(__dirname, 'db', 'schema.sql');
if (existsSync(schemaPath)) {
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

// Make db available to routes
app.locals.db = db;
app.locals.contentDir = join(__dirname, '..', 'content');

// Routes
app.use('/api/lessons', lessonsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/compile', compileRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`ArduinoLab API running on http://localhost:${PORT}`);
});
