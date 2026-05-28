import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

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
app.use(express.json({ limit: '50mb' }));

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      is_visible BOOLEAN,
      task_count INTEGER,
      folder_id TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      project_ids JSONB,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project_id TEXT,
      priority TEXT,
      due_date TEXT,
      reminder TEXT,
      repeat TEXT,
      repeat_custom TEXT,
      note TEXT,
      subtasks JSONB,
      pomodoro_estimate INTEGER,
      pomodoro_completed INTEGER,
      total_focus_time INTEGER,
      completed BOOLEAN,
      flagged BOOLEAN,
      tags JSONB,
      created_at TEXT,
      completed_at TEXT,
      updated_at TEXT
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
      visible_views JSONB
    );
    CREATE TABLE IF NOT EXISTS ui_state (
      id TEXT PRIMARY KEY,
      selected_task_id TEXT,
      active_view TEXT,
      active_project_id TEXT,
      search_query TEXT
    );
  `);
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: 'Database unavailable' });
  }
});

// Map DB row back to JS object
function mapTaskFromDb(r) {
  return {
    id: r.id, title: r.title, projectId: r.project_id, priority: r.priority,
    dueDate: r.due_date, reminder: r.reminder, repeat: r.repeat, repeatCustom: r.repeat_custom,
    note: r.note, subtasks: r.subtasks || [], pomodoroEstimate: r.pomodoro_estimate,
    pomodoroCompleted: r.pomodoro_completed, totalFocusTime: r.total_focus_time,
    completed: r.completed, flagged: r.flagged, tags: r.tags || [],
    createdAt: r.created_at, completedAt: r.completed_at, updatedAt: r.updated_at
  };
}

function mapSettingsFromDb(r) {
  return {
    pomodoroLength: r.pomodoro_length, shortBreakLength: r.short_break_length, longBreakLength: r.long_break_length,
    longBreakAfter: r.long_break_after, autoStartNextPomodoro: r.auto_start_next_pomodoro,
    autoStartBreak: r.auto_start_break, disableBreak: r.disable_break, alarmSound: r.alarm_sound,
    darkMode: r.dark_mode, themeWallpaper: r.theme_wallpaper, accentColor: r.accent_color,
    webhookUrl: r.webhook_url, webhookEnabled: r.webhook_enabled, externalApiUrl: r.external_api_url,
    externalApiEnabled: r.external_api_enabled, dailyFocusGoalHours: Number(r.daily_focus_goal_hours),
    visibleViews: r.visible_views || {}
  };
}

app.get('/api/state', async (req, res) => {
  try {
    const tasksRes = await pool.query('SELECT * FROM tasks');
    const projectsRes = await pool.query('SELECT * FROM projects');
    const foldersRes = await pool.query('SELECT * FROM folders');
    const tagsRes = await pool.query('SELECT * FROM tags');
    const logsRes = await pool.query('SELECT * FROM system_logs');
    const settingsRes = await pool.query("SELECT * FROM settings WHERE id = 'default'");
    const uiRes = await pool.query("SELECT * FROM ui_state WHERE id = 'default'");

    const state = {
      tasks: tasksRes.rows.map(mapTaskFromDb),
      projects: projectsRes.rows.map(r => ({ id: r.id, name: r.name, color: r.color, isVisible: r.is_visible, taskCount: r.task_count, folderId: r.folder_id, createdAt: r.created_at })),
      folders: foldersRes.rows.map(r => ({ id: r.id, name: r.name, color: r.color, projectIds: r.project_ids || [], createdAt: r.created_at })),
      tags: tagsRes.rows.map(r => ({ id: r.id, name: r.name, color: r.color, createdAt: r.created_at })),
      pomodoroSessions: logsRes.rows.map(r => ({ id: r.id, taskId: r.task_id, taskTitle: r.task_title, type: r.type, duration: r.duration, startTime: r.start_time, endTime: r.end_time, completed: r.completed })),
      webhookEvents: [],
      settings: settingsRes.rowCount > 0 ? mapSettingsFromDb(settingsRes.rows[0]) : null,
      selectedTaskId: uiRes.rowCount > 0 ? uiRes.rows[0].selected_task_id : null,
      activeView: uiRes.rowCount > 0 ? uiRes.rows[0].active_view : 'today',
      activeProjectId: uiRes.rowCount > 0 ? uiRes.rows[0].active_project_id : null,
      searchQuery: uiRes.rowCount > 0 ? uiRes.rows[0].search_query : ''
    };
    
    // Clean null object if no settings found
    if (!state.settings) delete state.settings;

    res.json({ state });
  } catch (error) {
    console.error('Failed to load remote state:', error);
    res.status(500).json({ error: 'Failed to load remote state' });
  }
});

async function syncTable(client, tableName, items, columns, toDbRow) {
  if (!items || items.length === 0) {
    await client.query(`DELETE FROM ${tableName}`);
    return;
  }
  
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const updateCols = columns.map(c => `${c} = EXCLUDED.${c}`).join(', ');
  
  const query = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (id) DO UPDATE SET ${updateCols}
  `;

  const incomingIds = new Set();
  for (const item of items) {
    if (!item.id) continue;
    incomingIds.add(item.id);
    await client.query(query, toDbRow(item));
  }

  const dbIdsRes = await client.query(`SELECT id FROM ${tableName}`);
  for (const row of dbIdsRes.rows) {
    if (!incomingIds.has(row.id)) {
      await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [row.id]);
    }
  }
}

app.post('/api/state', async (req, res) => {
  const client = await pool.connect();
  try {
    const s = req.body.state ?? req.body;
    await client.query('BEGIN');

    if (s.tasks) {
      await syncTable(client, 'tasks', s.tasks, 
        ['id', 'title', 'project_id', 'priority', 'due_date', 'reminder', 'repeat', 'repeat_custom', 'note', 'subtasks', 'pomodoro_estimate', 'pomodoro_completed', 'total_focus_time', 'completed', 'flagged', 'tags', 'created_at', 'completed_at', 'updated_at'],
        (t) => [t.id, t.title, t.projectId, t.priority, t.dueDate, t.reminder, t.repeat, t.repeatCustom, t.note, JSON.stringify(t.subtasks), t.pomodoroEstimate, t.pomodoroCompleted, t.totalFocusTime, t.completed, t.flagged, JSON.stringify(t.tags), t.createdAt, t.completedAt, t.updatedAt]
      );
    }

    if (s.projects) {
      await syncTable(client, 'projects', s.projects,
        ['id', 'name', 'color', 'is_visible', 'task_count', 'folder_id', 'created_at'],
        (p) => [p.id, p.name, p.color, p.isVisible, p.taskCount, p.folderId, p.createdAt]
      );
    }

    if (s.folders) {
      await syncTable(client, 'folders', s.folders,
        ['id', 'name', 'color', 'project_ids', 'created_at'],
        (f) => [f.id, f.name, f.color, JSON.stringify(f.projectIds), f.createdAt]
      );
    }

    if (s.tags) {
      await syncTable(client, 'tags', s.tags,
        ['id', 'name', 'color', 'created_at'],
        (t) => [t.id, t.name, t.color, t.createdAt]
      );
    }

    if (s.pomodoroSessions) {
      await syncTable(client, 'system_logs', s.pomodoroSessions,
        ['id', 'task_id', 'task_title', 'type', 'duration', 'start_time', 'end_time', 'completed'],
        (l) => [l.id, l.taskId, l.taskTitle, l.type, l.duration, l.startTime, l.endTime, l.completed]
      );
    }

    if (s.settings) {
      const set = s.settings;
      await client.query(`
        INSERT INTO settings (id, pomodoro_length, short_break_length, long_break_length, long_break_after, auto_start_next_pomodoro, auto_start_break, disable_break, alarm_sound, dark_mode, theme_wallpaper, accent_color, webhook_url, webhook_enabled, external_api_url, external_api_enabled, daily_focus_goal_hours, visible_views)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET 
          pomodoro_length = EXCLUDED.pomodoro_length, short_break_length = EXCLUDED.short_break_length, long_break_length = EXCLUDED.long_break_length, long_break_after = EXCLUDED.long_break_after, auto_start_next_pomodoro = EXCLUDED.auto_start_next_pomodoro, auto_start_break = EXCLUDED.auto_start_break, disable_break = EXCLUDED.disable_break, alarm_sound = EXCLUDED.alarm_sound, dark_mode = EXCLUDED.dark_mode, theme_wallpaper = EXCLUDED.theme_wallpaper, accent_color = EXCLUDED.accent_color, webhook_url = EXCLUDED.webhook_url, webhook_enabled = EXCLUDED.webhook_enabled, external_api_url = EXCLUDED.external_api_url, external_api_enabled = EXCLUDED.external_api_enabled, daily_focus_goal_hours = EXCLUDED.daily_focus_goal_hours, visible_views = EXCLUDED.visible_views
      `, ['default', set.pomodoroLength, set.shortBreakLength, set.longBreakLength, set.longBreakAfter, set.autoStartNextPomodoro, set.autoStartBreak, set.disableBreak, set.alarmSound, set.darkMode, set.themeWallpaper, set.accentColor, set.webhookUrl, set.webhookEnabled, set.externalApiUrl, set.externalApiEnabled, set.dailyFocusGoalHours, JSON.stringify(set.visibleViews)]);
    }

    // UI state
    await client.query(`
      INSERT INTO ui_state (id, selected_task_id, active_view, active_project_id, search_query)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        selected_task_id = EXCLUDED.selected_task_id, active_view = EXCLUDED.active_view, active_project_id = EXCLUDED.active_project_id, search_query = EXCLUDED.search_query
    `, ['default', s.selectedTaskId, s.activeView, s.activeProjectId, s.searchQuery]);

    await client.query('COMMIT');
    res.json({ status: 'ok' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to save remote state:', error);
    res.status(500).json({ error: 'Failed to save remote state' });
  } finally {
    client.release();
  }
});

const PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 4000;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Focus To Do backend is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Unable to initialize backend:', error);
    process.exit(1);
  });
