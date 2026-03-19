# ArduinoLab — Arduino Learning Platform

See the full specification in the parent task description.
This directory contains a full-stack Arduino learning platform for Alexey.

## Quick Start
```bash
cd learnarduino
npm install
npm run dev
```

## Stack
- Client: React (Vite) + TailwindCSS + Monaco Editor + avr8js
- Server: Express + SQLite (better-sqlite3)
- Content: Markdown files in /content

## Structure
- `/client` — React frontend (port 5173)
- `/server` — Express API (port 3001)
- `/content` — Lesson content (markdown, starter code, quizzes)
- `/scripts` — Build utilities
