import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: './.env' });

const csvPath = path.resolve('../tasks.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l);
const headers = lines[0]; // Title,Due Date
const tasksFromCsv = lines.slice(1).map(line => {
  const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
  if (!parts) return null;
  const title = parts[0] ? parts[0].replace(/^"|"$/g, '') : '';
  const dueDateStr = parts[1] ? parts[1].replace(/^"|"$/g, '') : '';
  
  // parse "25 May" into ISO string for year 2026 if it doesn't have a year?
  // Actually, we can just save it or parse roughly.
  let dueDate = null;
  if (dueDateStr) {
    const d = new Date(`${dueDateStr} ${new Date().getFullYear()}`);
    if (!isNaN(d.getTime())) {
      dueDate = d.toISOString();
    }
  }

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    projectId: null,
    priority: 'none',
    dueDate,
    reminder: null,
    repeat: 'none',
    repeatCustom: null,
    note: '',
    subtasks: [],
    pomodoroEstimate: 0,
    pomodoroCompleted: 0,
    totalFocusTime: 0,
    completed: false,
    flagged: false,
    tags: [],
    createdAt: now,
    completedAt: null,
    updatedAt: now,
  };
}).filter(t => t);

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  const res = await pool.query('SELECT state FROM app_state WHERE id = $1', ['default']);
  let state = { tasks: [], projects: [], folders: [], tags: [], settings: {} };
  
  if (res.rowCount > 0 && res.rows[0].state) {
    state = res.rows[0].state;
  }
  
  if (!state.tasks) state.tasks = [];
  
  const initialCount = state.tasks.length;
  state.tasks = [...state.tasks, ...tasksFromCsv];
  
  await pool.query(
    `INSERT INTO app_state (id, state, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at`,
    ['default', state]
  );
  
  console.log(`Successfully added ${tasksFromCsv.length} tasks. Total is now ${state.tasks.length}.`);
  pool.end();
}

run().catch(err => {
  console.error(err);
  pool.end();
});
