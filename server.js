import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { createTasksRouter } from './routes/tasks.js';
import swaggerRouter from './routes/swagger.js';
import { createAuth, hashKey } from './routes/auth.js';
import { createProjectsRouter } from './routes/projects.js';
import { createFoldersRouter } from './routes/folders.js';
import { createTagsRouter } from './routes/tags.js';
import { createChangesRouter } from './routes/changes.js';
import { createHooksRouter, createIntegrationsRouter } from './routes/hooks.js';
import { createEventsRouter, notifyChange } from './routes/events.js';

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

const DBG_VARS_OK = !!(DB_HOST && DB_PORT && DB_NAME && DB_USER && DB_PASSWORD);
if (!DBG_VARS_OK) {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    console.error('Missing required DB environment variables in .env');
    process.exit(1);
  } else {
    console.warn('[VERCEL] Database credentials not configured. Set DB_* environment variables on Vercel dashboard.');
  }
}

const pool = new Pool({
  host: DB_HOST || 'localhost',
  port: Number(DB_PORT) || 5432,
  database: DB_NAME || 'focustodo',
  user: DB_USER || 'postgres',
  password: DB_PASSWORD || 'postgres',
  max: 10,
});

const app = express();
app.use(cors());
// Inbound webhook cần RAW body để xác thực HMAC -> parser raw CHỈ cho /api/hooks,
// đăng ký TRƯỚC express.json (body-parser đặt req._body nên json sẽ bỏ qua).
app.use('/api/hooks', express.raw({ type: '*/*', limit: '1mb' }));
app.use(express.json({ limit: '10mb' }));

// Auth dùng chung (scoped API keys + nhận diện SPA cùng origin).
const auth = createAuth(pool);

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
      is_deleted BOOLEAN DEFAULT false,
      is_knowledge BOOLEAN DEFAULT false
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
  `);

  // Thêm cột is_deleted cho bảng cũ
  try {
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_knowledge BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE folders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
  } catch (err) {
    console.warn('[safety] Could not add is_deleted column', err.message);
  }

  // GĐ1: cột position (kéo-thả) + updated_at (changes-feed/LWW) + index.
  try {
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;');
    await pool.query('ALTER TABLE folders ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TEXT;');
    await pool.query('ALTER TABLE folders ADD COLUMN IF NOT EXISTS updated_at TEXT;');
    await pool.query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS updated_at TEXT;');
    // GĐ4: thư mục lồng nhiều cấp.
    await pool.query('ALTER TABLE folders ADD COLUMN IF NOT EXISTS parent_id TEXT;');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_folders_updated_at ON folders(updated_at);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tags_updated_at ON tags(updated_at);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_project_pos ON tasks(project_id, position);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);');

    // Backfill 1 lần: bù updated_at từ created_at nơi còn NULL.
    await pool.query('UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL;');
    await pool.query('UPDATE projects SET updated_at = created_at WHERE updated_at IS NULL;');
    await pool.query('UPDATE folders SET updated_at = created_at WHERE updated_at IS NULL;');
    await pool.query('UPDATE tags SET updated_at = created_at WHERE updated_at IS NULL;');

    // Backfill 1 lần: gán position theo thứ tự created_at trong từng scope,
    // chỉ chạy khi position còn ở mặc định (tất cả = 0) để không đè thứ tự đã chỉnh.
    const taskPos = await pool.query('SELECT count(*)::int AS n FROM tasks WHERE position <> 0');
    if (taskPos.rows[0].n === 0) {
      await pool.query(`
        UPDATE tasks t SET position = sub.rn FROM (
          SELECT id, (row_number() OVER (PARTITION BY project_id ORDER BY created_at) - 1) AS rn FROM tasks
        ) sub WHERE t.id = sub.id;
      `);
    }
    const projPos = await pool.query('SELECT count(*)::int AS n FROM projects WHERE position <> 0');
    if (projPos.rows[0].n === 0) {
      await pool.query(`
        UPDATE projects p SET position = sub.rn FROM (
          SELECT id, (row_number() OVER (PARTITION BY folder_id ORDER BY created_at) - 1) AS rn FROM projects
        ) sub WHERE p.id = sub.id;
      `);
    }
    const folderPos = await pool.query('SELECT count(*)::int AS n FROM folders WHERE position <> 0');
    if (folderPos.rows[0].n === 0) {
      await pool.query(`
        UPDATE folders f SET position = sub.rn FROM (
          SELECT id, (row_number() OVER (ORDER BY created_at) - 1) AS rn FROM folders
        ) sub WHERE f.id = sub.id;
      `);
    }
  } catch (err) {
    console.warn('[safety] Could not run GĐ1 schema migration', err.message);
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

  // Di trú key tĩnh cũ: nếu API_KEY được đặt và bảng api_keys còn rỗng,
  // seed 1 dòng hash với đủ scope để tích hợp cũ không gãy.
  if (process.env.API_KEY) {
    try {
      const keyCount = await pool.query('SELECT count(*)::int AS n FROM api_keys');
      if (keyCount.rows[0].n === 0) {
        const raw = process.env.API_KEY;
        await pool.query(
          `INSERT INTO api_keys (id, key_hash, key_prefix, label, scopes, created_at, revoked)
           VALUES ($1,$2,$3,$4,$5,$6,false)`,
          [
            'legacy-api-key',
            hashKey(raw),
            String(raw).slice(0, 12),
            'Legacy API_KEY (migrated)',
            JSON.stringify(['admin']),
            new Date().toISOString(),
          ],
        );
        console.log('[migrate] Seeded api_keys from legacy API_KEY env var.');
      }
    } catch (err) {
      console.warn('[migrate] Could not seed legacy API_KEY into api_keys', err.message);
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
    position: r.position ?? 0,
    createdAt: r.created_at ?? null,
    completedAt: r.completed_at ?? null,
    updatedAt: r.updated_at ?? null,
    isKnowledge: r.is_knowledge ?? false,
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
    position: r.position ?? 0,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

function rowToFolder(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    projectIds: r.project_ids ?? [],
    parentId: r.parent_id ?? null,
    position: r.position ?? 0,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

function rowToTag(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
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
      pool.query('SELECT * FROM tasks WHERE is_deleted = false OR is_deleted IS NULL ORDER BY position ASC, created_at DESC'),
      pool.query('SELECT * FROM projects WHERE is_deleted = false OR is_deleted IS NULL ORDER BY position ASC, created_at ASC'),
      pool.query('SELECT * FROM folders WHERE is_deleted = false OR is_deleted IS NULL ORDER BY position ASC, created_at ASC'),
      pool.query('SELECT * FROM tags WHERE is_deleted = false OR is_deleted IS NULL ORDER BY created_at ASC'),
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
// GĐ1: UPSERT-ONLY. KHÔNG còn xoá-theo-vắng-mặt — đó là nguồn gốc lỗi mất
// dữ liệu khi app ngoài ghi qua /api/tasks rồi SPA lưu full-state cũ. Xoá nay
// chỉ đến từ deletedIds tường minh (applyDeletedIds). Nếu có lwwColumn thì áp
// dụng last-write-wins: chỉ ghi đè khi bản tới mới-hơn-hoặc-bằng (theo updated_at).
async function reconcileTable(client, table, rows, columns, toValues, lwwColumn) {
  // Khoá hàng theo thứ tự id cố định để hai transaction đồng thời không
  // deadlock (cùng thứ tự lock).
  const sortedRows = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const row of sortedRows) {
    const cols = columns;
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const updates = cols
      .filter((c) => c !== 'id')
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    const guard = lwwColumn
      ? ` WHERE EXCLUDED.${lwwColumn} >= ${table}.${lwwColumn} OR ${table}.${lwwColumn} IS NULL`
      : '';
    await client.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updates}${guard}`,
      toValues(row),
    );
  }
}

// Xoá mềm tường minh theo danh sách id. KHÔNG áp guard %-mass-delete ở đây:
// xoá nay là chủ đích (client liệt kê id cụ thể), khác hẳn cơ chế "xoá theo
// vắng-mặt" cũ vốn là nguồn gây mất dữ liệu (đã loại bỏ). Guard % sẽ chặn nhầm
// thao tác hợp lệ như "Clear all completed". Mảng rỗng -> không xoá gì.
async function applyDeletedIds(client, table, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  await client.query(
    `UPDATE ${table} SET is_deleted = true, updated_at = $2 WHERE id = ANY($1::text[])`,
    [ids, new Date().toISOString()],
  );
}

// ============================================================
// POST /api/state - persist full state transactionally
// ============================================================
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function persistState(incoming) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const nowIso = new Date().toISOString();

    // --- tasks ---
    await reconcileTable(
      client,
      'tasks',
      incoming.tasks ?? [],
      ['id', 'title', 'project_id', 'priority', 'due_date', 'reminder', 'repeat',
        'repeat_custom', 'note', 'subtasks', 'pomodoro_estimate', 'pomodoro_completed',
        'total_focus_time', 'completed', 'flagged', 'tags', 'position', 'created_at', 'completed_at', 'updated_at', 'is_knowledge'],
      (t) => [
        t.id, t.title ?? '', t.projectId ?? null, t.priority ?? 'none', t.dueDate ?? null,
        t.reminder ?? null, t.repeat ?? 'none', t.repeatCustom ?? null, t.note ?? '',
        JSON.stringify(t.subtasks ?? []), t.pomodoroEstimate ?? 1, t.pomodoroCompleted ?? 0,
        Math.round(t.totalFocusTime ?? 0), t.completed ?? false, t.flagged ?? false,
        JSON.stringify(t.tags ?? []), t.position ?? 0, t.createdAt ?? null, t.completedAt ?? null,
        t.updatedAt ?? t.createdAt ?? nowIso, t.isKnowledge ?? false,
      ],
      'updated_at',
    );

    // --- projects ---
    await reconcileTable(
      client,
      'projects',
      incoming.projects ?? [],
      ['id', 'name', 'color', 'is_visible', 'task_count', 'folder_id', 'position', 'created_at', 'updated_at'],
      (p) => [
        p.id, p.name ?? '', p.color ?? '#7ec8e3', p.isVisible ?? true,
        p.taskCount ?? 0, p.folderId ?? null, p.position ?? 0, p.createdAt ?? null,
        p.updatedAt ?? p.createdAt ?? nowIso,
      ],
      'updated_at',
    );

    // --- folders ---
    await reconcileTable(
      client,
      'folders',
      incoming.folders ?? [],
      ['id', 'name', 'color', 'project_ids', 'parent_id', 'position', 'created_at', 'updated_at'],
      (f) => [
        f.id, f.name ?? '', f.color ?? '#7ec8e3',
        JSON.stringify(f.projectIds ?? []), f.parentId ?? null, f.position ?? 0, f.createdAt ?? null,
        f.updatedAt ?? f.createdAt ?? nowIso,
      ],
      'updated_at',
    );

    // --- tags ---
    await reconcileTable(
      client,
      'tags',
      incoming.tags ?? [],
      ['id', 'name', 'color', 'created_at', 'updated_at'],
      (t) => [t.id, t.name ?? '', t.color ?? '#7ec8e3', t.createdAt ?? null, t.updatedAt ?? t.createdAt ?? nowIso],
      'updated_at',
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

    // --- xoá mềm tường minh theo deletedIds (nếu client gửi) ---
    const del = incoming.deletedIds ?? {};
    await applyDeletedIds(client, 'tasks', del.tasks);
    await applyDeletedIds(client, 'projects', del.projects);
    await applyDeletedIds(client, 'folders', del.folders);
    await applyDeletedIds(client, 'tags', del.tags);

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
// Public API - cho hệ thống bên ngoài đọc/ghi (scoped API keys)
// ============================================================
// Sau mỗi mutation thành công (2xx, không phải GET) -> bắn SSE "nudge" để client
// poll /api/changes ngay. Một chỗ duy nhất, bao mọi endpoint ghi (kể cả /api/state,
// /api/hooks). SSE GET tự loại trừ.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) notifyChange();
    });
  }
  next();
});

app.use('/api/events', createEventsRouter(pool, auth));
app.use('/api/keys', auth.keysRouter);
app.use('/api/tasks', createTasksRouter(pool, auth));
app.use('/api/projects', createProjectsRouter(pool, auth));
app.use('/api/folders', createFoldersRouter(pool, auth));
app.use('/api/tags', createTagsRouter(pool, auth));
app.use('/api/changes', createChangesRouter(pool, auth));
app.use('/api/integrations', createIntegrationsRouter(pool, auth));
app.use('/api/hooks', createHooksRouter(pool));

// ============================================================
// Swagger UI tai /api/docs
// ============================================================
app.use('/api/docs', swaggerRouter);

const PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 4000;

app.get('/api/health', async (req, res) => {
  if (!DBG_VARS_OK) {
    return res.status(503).json({
      status: 'error',
      db: 'not_configured',
      message: 'Database credentials missing. Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD on Vercel Dashboard → Environment Variables',
      configured_vars: {
        DB_HOST: !!DB_HOST,
        DB_PORT: !!DB_PORT,
        DB_NAME: !!DB_NAME,
        DB_USER: !!DB_USER,
        DB_PASSWORD: !!DB_PASSWORD,
      }
    });
  }
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'connection_failed', message: err.message });
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

// ensureSchema phải chạy ĐÚNG MỘT LẦN lúc khởi động:
//  - Khi tự listen (VPS/dev): startWithRetry() đã gọi ensureSchema() rồi await
//    trước khi listen -> KHÔNG gọi lần nữa ở đây (tránh đua tạo bảng -> 23505).
//  - Khi serverless (Vercel): không có startWithRetry() -> phải init schema ở đây.
const willListen = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
if (!DBG_VARS_OK) {
  console.warn('[STARTUP] Skipping schema initialization - database not configured');
} else if (!willListen) {
  ensureSchema().catch(err => console.error('Failed to init schema:', err));
}

if (willListen) {
  startWithRetry();
}

export default app;
