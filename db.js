import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pkg;
const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
} = process.env;

export const pool = new Pool({
  host: DB_HOST || 'localhost',
  port: Number(DB_PORT) || 5432,
  database: DB_NAME || 'focustodo',
  user: DB_USER || 'postgres',
  password: DB_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

export function hashPassword(password) {
  const salt = 'focustodo_salt_secure_123';
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export async function ensureSchema() {
  // 1. Tao bang users truoc
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Tao cac bang khac neu chua ton tai
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT,
      project_id TEXT,
      priority TEXT,
      due_date TEXT,
      reminder TEXT,
      repeat TEXT,
      repeat_custom TEXT,
      note TEXT,
      subtasks JSONB DEFAULT '[]'::jsonb,
      pomodoro_estimate INTEGER DEFAULT 1,
      pomodoro_completed INTEGER DEFAULT 0,
      total_focus_time INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT false,
      flagged BOOLEAN DEFAULT false,
      tags JSONB DEFAULT '[]'::jsonb,
      created_at TEXT,
      completed_at TEXT,
      updated_at TEXT,
      is_deleted BOOLEAN DEFAULT false,
      is_knowledge BOOLEAN DEFAULT false,
      position INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      is_visible BOOLEAN DEFAULT true,
      task_count INTEGER DEFAULT 0,
      folder_id TEXT,
      created_at TEXT,
      is_deleted BOOLEAN DEFAULT false,
      position INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      project_ids JSONB DEFAULT '[]'::jsonb,
      created_at TEXT,
      is_deleted BOOLEAN DEFAULT false,
      position INTEGER DEFAULT 0,
      parent_id TEXT,
      is_visible BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      created_at TEXT,
      is_deleted BOOLEAN DEFAULT false,
      project_id TEXT,
      folder_id TEXT,
      is_visible BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      pomodoro_length INTEGER,
      short_break_length INTEGER,
      long_break_length INTEGER,
      long_break_after INTEGER,
      auto_start_next_pomodoro BOOLEAN,
      auto_start_break BOOLEAN,
      disable_break BOOLEAN,
      alarm_sound BOOLEAN,
      dark_mode TEXT,
      theme_wallpaper TEXT,
      accent_color TEXT,
      webhook_url TEXT,
      webhook_enabled BOOLEAN,
      external_api_url TEXT,
      external_api_enabled BOOLEAN,
      daily_focus_goal_hours NUMERIC,
      visible_views JSONB DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS ui_state (
      id TEXT PRIMARY KEY,
      selected_task_id TEXT,
      active_view TEXT,
      active_project_id TEXT,
      search_query TEXT
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      task_title TEXT,
      type TEXT,
      duration INTEGER,
      start_time TEXT,
      end_time TEXT,
      completed BOOLEAN
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL,
      key_prefix TEXT,
      label TEXT,
      scopes JSONB DEFAULT '[]'::jsonb,
      created_at TEXT,
      last_used_at TEXT,
      revoked BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS webhook_endpoints (
      integration TEXT PRIMARY KEY,
      secret TEXT,
      mapping JSONB DEFAULT '{}'::jsonb,
      default_project_id TEXT,
      enabled BOOLEAN DEFAULT true,
      created_at TEXT,
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      is_deleted BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS pomodoro_records (
      id TEXT PRIMARY KEY,
      task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      task_title TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      break_start TEXT,
      break_end TEXT,
      completed BOOLEAN DEFAULT false,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted BOOLEAN DEFAULT false
    );
  `);

  // 3. Them cot user_id vao cac bang neu chua co
  const tables = [
    'tasks', 'projects', 'folders', 'tags', 'settings',
    'ui_state', 'system_logs', 'api_keys', 'webhook_endpoints',
    'attachments', 'pomodoro_records'
  ];

  for (const table of tables) {
    try {
      await pool.query(`
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
      `);
    } catch (err) {
      console.warn(`[schema] Khong the them user_id vao bang ${table}:`, err.message);
    }
  }

  // 4. Tao tai khoan mac dinh neu chua co user nao de backfill
  try {
    const userCount = await pool.query('SELECT count(*)::int AS n FROM users');
    if (userCount.rows[0].n === 0) {
      const defaultUserId = 'default_user';
      const defaultEmail = 'default@focustodo.local';
      // mat khau mac dinh la 'admin123'
      const hashedPw = hashPassword('admin123');
      const now = new Date().toISOString();
      await pool.query(`
        INSERT INTO users (id, email, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [defaultUserId, defaultEmail, hashedPw, now, now]);

      console.log('[schema] Da tao nguoi dung mac dinh de backfill du lieu: ' + defaultEmail);

      // Backfill user_id cho du lieu cu dang NULL
      for (const table of tables) {
        await pool.query(`UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`, [defaultUserId]);
      }
      console.log('[schema] Da hoan thanh backfill user_id cho cac ban ghi hien tai.');
    }
  } catch (err) {
    console.error('[schema] Loi khoi tao nguoi dung mac dinh / backfill:', err.message);
  }

  // 5. Tao cac Index can thiet
  try {
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_pomodoro_records_task_id ON pomodoro_records(task_id);');
  } catch (err) {
    console.warn('[safety] Khong the tao cac index:', err.message);
  }
}
