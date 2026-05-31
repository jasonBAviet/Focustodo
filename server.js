import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { createTasksRouter } from './routes/tasks.js';
import swaggerRouter from './routes/swagger.js';

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

if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
  console.error('Missing required DB environment variables in .env');
  process.exit(1);
}

const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 10,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// Schema: normalized tables (one row per entity)
// ============================================================
async function ensureSchema() {
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
      is_deleted BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      is_visible BOOLEAN DEFAULT true,
      task_count INTEGER DEFAULT 0,
      folder_id TEXT,
      created_at TEXT,
      is_deleted BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      project_ids JSONB DEFAULT '[]'::jsonb,
      created_at TEXT,
      is_deleted BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      created_at TEXT,
      is_deleted BOOLEAN DEFAULT false
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
  `);

  // Thêm cột is_deleted cho bảng cũ
  try {
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE folders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
  } catch (err) {
    console.warn('[safety] Could not add is_deleted column', err.message);
  }

  // Seed the 4 default projects only when projects table is empty.
  const projCount = await pool.query('SELECT count(*)::int AS n FROM projects');
  if (projCount.rows[0].n === 0) {
    const now = new Date().toISOString();
    const defaults = [
      ['inbox', 'Inbox', '#7ec8e3'],
      ['work', 'Work', '#4361ee'],
      ['study', 'Study', '#06d6a0'],
      ['personal', 'Personal', '#f4a261'],
    ];
    for (const [id, name, color] of defaults) {
      await pool.query(
        `INSERT INTO projects (id, name, color, is_visible, task_count, folder_id, created_at)
         VALUES ($1,$2,$3,true,0,NULL,$4) ON CONFLICT (id) DO NOTHING`,
        [id, name, color, now],
      );
    }
  }
}

// ============================================================
// Mapping helpers: DB row (snake_case) -> app object (camelCase)
// ============================================================
function rowToTask(r) {
  return {
    id: r.id,
    title: r.title ?? '',
    projectId: r.project_id ?? null,
    priority: r.priority ?? 'none',
    dueDate: r.due_date ?? null,
    reminder: r.reminder ?? null,
    repeat: r.repeat ?? 'none',
    repeatCustom: r.repeat_custom ?? null,
    note: r.note ?? '',
    subtasks: r.subtasks ?? [],
    pomodoroEstimate: r.pomodoro_estimate ?? 1,
    pomodoroCompleted: r.pomodoro_completed ?? 0,
    totalFocusTime: r.total_focus_time ?? 0,
    completed: r.completed ?? false,
    flagged: r.flagged ?? false,
    tags: r.tags ?? [],
    createdAt: r.created_at ?? null,
    completedAt: r.completed_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

function rowToProject(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    isVisible: r.is_visible ?? true,
    taskCount: r.task_count ?? 0,
    folderId: r.folder_id ?? null,
    createdAt: r.created_at ?? null,
  };
}

function rowToFolder(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    projectIds: r.project_ids ?? [],
    createdAt: r.created_at ?? null,
  };
}

function rowToTag(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    createdAt: r.created_at ?? null,
  };
}

function rowToSettings(r) {
  return {
    pomodoroLength: r.pomodoro_length ?? 25,
    shortBreakLength: r.short_break_length ?? 5,
    longBreakLength: r.long_break_length ?? 15,
    longBreakAfter: r.long_break_after ?? 4,
    autoStartNextPomodoro: r.auto_start_next_pomodoro ?? false,
    autoStartBreak: r.auto_start_break ?? false,
    disableBreak: r.disable_break ?? false,
    alarmSound: r.alarm_sound ?? true,
    darkMode: r.dark_mode ?? 'dark',
    themeWallpaper: r.theme_wallpaper ?? 'dark-forest',
    accentColor: r.accent_color ?? '#f25f5c',
    webhookUrl: r.webhook_url ?? '',
    webhookEnabled: r.webhook_enabled ?? false,
    externalApiUrl: r.external_api_url ?? '',
    externalApiEnabled: r.external_api_enabled ?? false,
    dailyFocusGoalHours: r.daily_focus_goal_hours != null ? Number(r.daily_focus_goal_hours) : 3,
    visibleViews: r.visible_views ?? {},
  };
}

function rowToSession(r) {
  return {
    id: r.id,
    taskId: r.task_id ?? null,
    taskTitle: r.task_title ?? null,
    type: r.type ?? 'focus',
    duration: r.duration ?? 0,
    startTime: r.start_time ?? null,
    endTime: r.end_time ?? null,
    completed: r.completed ?? true,
  };
}

// ============================================================
// GET /api/state - aggregate all tables into a full app state
// ============================================================
app.get('/api/state', async (req, res) => {
  try {
    const [tasks, projects, folders, tags, settings, ui, sessions] = await Promise.all([
      pool.query('SELECT * FROM tasks WHERE is_deleted = false OR is_deleted IS NULL'),
      pool.query('SELECT * FROM projects WHERE is_deleted = false OR is_deleted IS NULL'),
      pool.query('SELECT * FROM folders WHERE is_deleted = false OR is_deleted IS NULL'),
      pool.query('SELECT * FROM tags WHERE is_deleted = false OR is_deleted IS NULL'),
      pool.query("SELECT * FROM settings WHERE id = 'default'"),
      pool.query("SELECT * FROM ui_state WHERE id = 'default'"),
      pool.query('SELECT * FROM system_logs'),
    ]);

    const uiRow = ui.rows[0] ?? {};

    const state = {
      tasks: tasks.rows.map(rowToTask),
      projects: projects.rows.map(rowToProject),
      folders: folders.rows.map(rowToFolder),
      tags: tags.rows.map(rowToTag),
      settings: settings.rows[0] ? rowToSettings(settings.rows[0]) : null,
      pomodoroSessions: sessions.rows.map(rowToSession),
      selectedTaskId: uiRow.selected_task_id ?? null,
      activeView: uiRow.active_view ?? 'today',
      activeProjectId: uiRow.active_project_id ?? null,
      searchQuery: uiRow.search_query ?? '',
    };

    res.json({ state });
  } catch (error) {
    console.error('Failed to load remote state:', error);
    res.status(500).json({ error: 'Failed to load remote state' });
  }
});

// ============================================================
// Reconciliation helper: upsert payload rows, delete the rest
// ============================================================
async function reconcileTable(client, table, rows, columns, toValues) {
  // Khoá hàng theo thứ tự id cố định để hai transaction đồng thời không
  // deadlock (cùng thứ tự lock).
  const sortedRows = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  // Upsert every row in the payload
  for (const row of sortedRows) {
    const cols = columns;
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const updates = cols
      .filter((c) => c !== 'id')
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    await client.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      toValues(row),
    );
  }
  // Delete rows no longer present in the payload.
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    // SAFETY: chặn xoá thảm hoạ - nếu payload sẽ xoá >=90% bảng đang có
    // >=20 dòng thì nhiều khả năng client gửi state cũ/lỗi -> bỏ qua delete.
    const existing = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
    const total = existing.rows[0].n;
    if (total >= 20 && ids.length < total * 0.1) {
      console.warn(`[safety] Skip mass-delete on "${table}": payload ${ids.length} vs existing ${total}.`);
    } else {
      await client.query(
        `UPDATE ${table} SET is_deleted = true WHERE id <> ALL($1::text[])`,
        [ids],
      );
    }
  } else {
    // SAFETY: không xoá sạch một bảng đang có dữ liệu khi payload rỗng.
    // Payload rỗng thường là do client chưa load xong (state trống) -> nếu
    // xoá hết sẽ mất dữ liệu (đã từng xảy ra do crash loop). Bỏ qua delete.
    const existing = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
    if (existing.rows[0].n > 0) {
      console.warn(`[safety] Skip wiping non-empty table "${table}" with empty payload.`);
    }
  }
}

// ============================================================
// POST /api/state - persist full state transactionally
// ============================================================
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function persistState(incoming) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- tasks ---
    await reconcileTable(
      client,
      'tasks',
      incoming.tasks ?? [],
      ['id', 'title', 'project_id', 'priority', 'due_date', 'reminder', 'repeat',
        'repeat_custom', 'note', 'subtasks', 'pomodoro_estimate', 'pomodoro_completed',
        'total_focus_time', 'completed', 'flagged', 'tags', 'created_at', 'completed_at', 'updated_at'],
      (t) => [
        t.id, t.title ?? '', t.projectId ?? null, t.priority ?? 'none', t.dueDate ?? null,
        t.reminder ?? null, t.repeat ?? 'none', t.repeatCustom ?? null, t.note ?? '',
        JSON.stringify(t.subtasks ?? []), t.pomodoroEstimate ?? 1, t.pomodoroCompleted ?? 0,
        Math.round(t.totalFocusTime ?? 0), t.completed ?? false, t.flagged ?? false,
        JSON.stringify(t.tags ?? []), t.createdAt ?? null, t.completedAt ?? null, t.updatedAt ?? null,
      ],
    );

    // --- projects ---
    await reconcileTable(
      client,
      'projects',
      incoming.projects ?? [],
      ['id', 'name', 'color', 'is_visible', 'task_count', 'folder_id', 'created_at'],
      (p) => [
        p.id, p.name ?? '', p.color ?? '#7ec8e3', p.isVisible ?? true,
        p.taskCount ?? 0, p.folderId ?? null, p.createdAt ?? null,
      ],
    );

    // --- folders ---
    await reconcileTable(
      client,
      'folders',
      incoming.folders ?? [],
      ['id', 'name', 'color', 'project_ids', 'created_at'],
      (f) => [
        f.id, f.name ?? '', f.color ?? '#7ec8e3',
        JSON.stringify(f.projectIds ?? []), f.createdAt ?? null,
      ],
    );

    // --- tags ---
    await reconcileTable(
      client,
      'tags',
      incoming.tags ?? [],
      ['id', 'name', 'color', 'created_at'],
      (t) => [t.id, t.name ?? '', t.color ?? '#7ec8e3', t.createdAt ?? null],
    );

    // --- system_logs (pomodoro sessions) ---
    await reconcileTable(
      client,
      'system_logs',
      incoming.pomodoroSessions ?? [],
      ['id', 'task_id', 'task_title', 'type', 'duration', 'start_time', 'end_time', 'completed'],
      (s) => [
        s.id, s.taskId ?? null, s.taskTitle ?? null, s.type ?? 'focus',
        s.duration ?? 0, s.startTime ?? null, s.endTime ?? null, s.completed ?? true,
      ],
    );

    // --- settings (single row id='default') ---
    if (incoming.settings) {
      const s = incoming.settings;
      await client.query(
        `INSERT INTO settings (
           id, pomodoro_length, short_break_length, long_break_length, long_break_after,
           auto_start_next_pomodoro, auto_start_break, disable_break, alarm_sound,
           dark_mode, theme_wallpaper, accent_color, webhook_url, webhook_enabled,
           external_api_url, external_api_enabled, daily_focus_goal_hours, visible_views
         ) VALUES ('default',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO UPDATE SET
           pomodoro_length = EXCLUDED.pomodoro_length,
           short_break_length = EXCLUDED.short_break_length,
           long_break_length = EXCLUDED.long_break_length,
           long_break_after = EXCLUDED.long_break_after,
           auto_start_next_pomodoro = EXCLUDED.auto_start_next_pomodoro,
           auto_start_break = EXCLUDED.auto_start_break,
           disable_break = EXCLUDED.disable_break,
           alarm_sound = EXCLUDED.alarm_sound,
           dark_mode = EXCLUDED.dark_mode,
           theme_wallpaper = EXCLUDED.theme_wallpaper,
           accent_color = EXCLUDED.accent_color,
           webhook_url = EXCLUDED.webhook_url,
           webhook_enabled = EXCLUDED.webhook_enabled,
           external_api_url = EXCLUDED.external_api_url,
           external_api_enabled = EXCLUDED.external_api_enabled,
           daily_focus_goal_hours = EXCLUDED.daily_focus_goal_hours,
           visible_views = EXCLUDED.visible_views`,
        [
          s.pomodoroLength ?? 25, s.shortBreakLength ?? 5, s.longBreakLength ?? 15,
          s.longBreakAfter ?? 4, s.autoStartNextPomodoro ?? false, s.autoStartBreak ?? false,
          s.disableBreak ?? false, s.alarmSound ?? true, s.darkMode ?? 'dark',
          s.themeWallpaper ?? 'dark-forest', s.accentColor ?? '#f25f5c', s.webhookUrl ?? '',
          s.webhookEnabled ?? false, s.externalApiUrl ?? '', s.externalApiEnabled ?? false,
          s.dailyFocusGoalHours ?? 3, JSON.stringify(s.visibleViews ?? {}),
        ],
      );
    }

    // --- ui_state (single row id='default') ---
    await client.query(
      `INSERT INTO ui_state (id, selected_task_id, active_view, active_project_id, search_query)
       VALUES ('default',$1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET
         selected_task_id = EXCLUDED.selected_task_id,
         active_view = EXCLUDED.active_view,
         active_project_id = EXCLUDED.active_project_id,
         search_query = EXCLUDED.search_query`,
      [
        incoming.selectedTaskId ?? null,
        incoming.activeView ?? 'today',
        incoming.activeProjectId ?? null,
        incoming.searchQuery ?? '',
      ],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

app.post('/api/state', async (req, res) => {
  const incoming = req.body.state ?? req.body;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await persistState(incoming);
      return res.json({ status: 'ok' });
    } catch (error) {
      // 40P01 = deadlock_detected -> thử lại với độ trễ ngẫu nhiên
      if (error.code === '40P01' && attempt < maxAttempts) {
        await sleep(50 + Math.random() * 100);
        continue;
      }
      console.error('Failed to save remote state:', error);
      return res.status(500).json({ error: 'Failed to save remote state' });
    }
  }
});

// ============================================================
// Webhook Proxy - test and trigger Slack webhook from frontend
// ============================================================
app.post('/api/webhook/test', async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || { event: 'test', timestamp: new Date().toISOString() }),
    });

    const status = response.status;
    const statusText = response.statusText;

    res.status(200).json({
      status: 'success',
      code: status,
      message: `${status} ${statusText}`
    });
  } catch (error) {
    console.error('Webhook proxy error:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// ============================================================
// Public Task API - nhan/cung cap task cho he thong ben ngoai
// ============================================================
app.use('/api/tasks', createTasksRouter(pool));

// ============================================================
// Swagger UI tai /api/docs
// ============================================================
app.use('/api/docs', swaggerRouter);

const PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 4000;

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: err.message });
  }
});

async function startWithRetry(maxAttempts = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await ensureSchema();
      app.listen(PORT, () => {
        console.log(`Focus To Do backend is running on http://localhost:${PORT}`);
      });
      return;
    } catch (error) {
      console.error(`Startup attempt ${attempt}/${maxAttempts} failed:`, error.message);
      if (attempt < maxAttempts) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  console.error('Unable to initialize backend after all retries');
  process.exit(1);
}

// Initialize schema once on startup (works for both local and Vercel)
ensureSchema().catch(err => console.error('Failed to init schema:', err));

// Only listen locally in development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  startWithRetry();
}

export default app;
