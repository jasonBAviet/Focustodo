import { Router } from 'express';
import { pool } from '../db.js';
import { authenticateUser } from '../src/backend/modules/auth/auth.middleware.js';
import {
  rowToTask,
  rowToKnowledge,
  rowToDiary,
  rowToProject,
  rowToFolder,
  rowToTag,
  rowToSettings,
  rowToSession,
  rowToAttachment,
  rowToPomodoroRecord,
} from './state-mappers.js';

const router = Router();


async function reconcileTable(client, table, rows, columns, toValues, lwwColumn, userId) {
  const sortedRows = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const row of sortedRows) {
    const cols = [...columns, 'user_id'];
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const updates = columns
      .filter((c) => c !== 'id')
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    const guard = lwwColumn
      ? ` WHERE EXCLUDED.${lwwColumn} >= ${table}.${lwwColumn} OR ${table}.${lwwColumn} IS NULL`
      : '';
    await client.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updates}${guard}`,
      [...toValues(row), userId],
    );
  }
}

async function applyDeletedIds(client, table, ids, userId) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  await client.query(
    `UPDATE ${table} SET is_deleted = true, updated_at = $2 WHERE id = ANY($1::text[]) AND user_id = $3`,
    [ids, new Date().toISOString(), userId],
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function persistState(incoming, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const nowIso = new Date().toISOString();

    // 1. Reconcile tables
    await reconcileTable(
      client, 'tasks', incoming.tasks ?? [],
      ['id', 'title', 'project_id', 'priority', 'due_date', 'reminder', 'repeat',
        'repeat_custom', 'note', 'subtasks', 'pomodoro_estimate', 'pomodoro_completed',
        'total_focus_time', 'completed', 'flagged', 'tags', 'position', 'created_at', 'completed_at', 'updated_at'],
      (t) => [
        t.id, t.title ?? '', t.projectId ?? null, t.priority ?? 'none', t.dueDate ?? null,
        t.reminder ?? null, t.repeat ?? 'none', t.repeatCustom ?? null, t.note ?? '',
        JSON.stringify(t.subtasks ?? []), t.pomodoroEstimate ?? 1, t.pomodoroCompleted ?? 0,
        Math.round(t.totalFocusTime ?? 0), t.completed ?? false, t.flagged ?? false,
        JSON.stringify(t.tags ?? []), t.position ?? 0, t.createdAt ?? null, t.completedAt ?? null,
        t.updatedAt ?? t.createdAt ?? nowIso,
      ],
      'updated_at', userId
    );

    await reconcileTable(
      client, 'knowleadge', incoming.knowledges ?? [],
      ['id', 'title', 'project_id', 'priority', 'due_date', 'reminder', 'repeat',
        'repeat_custom', 'note', 'subtasks', 'pomodoro_estimate', 'pomodoro_completed',
        'total_focus_time', 'completed', 'flagged', 'tags', 'position', 'created_at', 'completed_at', 'updated_at'],
      (t) => [
        t.id, t.title ?? '', t.projectId ?? null, t.priority ?? 'none', t.dueDate ?? null,
        t.reminder ?? null, t.repeat ?? 'none', t.repeatCustom ?? null, t.note ?? '',
        JSON.stringify(t.subtasks ?? []), t.pomodoroEstimate ?? 1, t.pomodoroCompleted ?? 0,
        Math.round(t.totalFocusTime ?? 0), t.completed ?? false, t.flagged ?? false,
        JSON.stringify(t.tags ?? []), t.position ?? 0, t.createdAt ?? null, t.completedAt ?? null,
        t.updatedAt ?? t.createdAt ?? nowIso,
      ],
      'updated_at', userId
    );

    await reconcileTable(
      client, 'diary', incoming.diaries ?? [],
      ['id', 'title', 'project_id', 'priority', 'due_date', 'reminder', 'repeat',
        'repeat_custom', 'note', 'subtasks', 'pomodoro_estimate', 'pomodoro_completed',
        'total_focus_time', 'completed', 'flagged', 'tags', 'position', 'created_at', 'completed_at', 'updated_at', 'task_id'],
      (t) => [
        t.id, t.title ?? '', t.projectId ?? null, t.priority ?? 'none', t.dueDate ?? null,
        t.reminder ?? null, t.repeat ?? 'none', t.repeatCustom ?? null, t.note ?? '',
        JSON.stringify(t.subtasks ?? []), t.pomodoroEstimate ?? 1, t.pomodoroCompleted ?? 0,
        Math.round(t.totalFocusTime ?? 0), t.completed ?? false, t.flagged ?? false,
        JSON.stringify(t.tags ?? []), t.position ?? 0, t.createdAt ?? null, t.completedAt ?? null,
        t.updatedAt ?? t.createdAt ?? nowIso, t.taskId ?? null,
      ],
      'updated_at', userId
    );

    await reconcileTable(
      client, 'projects', incoming.projects ?? [],
      ['id', 'name', 'color', 'is_visible', 'task_count', 'folder_id', 'position', 'created_at', 'updated_at'],
      (p) => [
        p.id, p.name ?? '', p.color ?? '#7ec8e3', p.isVisible ?? true,
        p.taskCount ?? 0, p.folderId ?? null, p.position ?? 0, p.createdAt ?? null,
        p.updatedAt ?? p.createdAt ?? nowIso,
      ],
      'updated_at', userId
    );

    await reconcileTable(
      client, 'folders', incoming.folders ?? [],
      ['id', 'name', 'color', 'project_ids', 'parent_id', 'position', 'is_visible', 'created_at', 'updated_at'],
      (f) => [
        f.id, f.name ?? '', f.color ?? '#7ec8e3',
        JSON.stringify(f.projectIds ?? []), f.parentId ?? null, f.position ?? 0, f.isVisible ?? true, f.createdAt ?? null,
        f.updatedAt ?? f.createdAt ?? nowIso,
      ],
      'updated_at', userId
    );

    await reconcileTable(
      client, 'tags', incoming.tags ?? [],
      ['id', 'name', 'color', 'project_id', 'folder_id', 'is_visible', 'created_at', 'updated_at'],
      (t) => [
        t.id, t.name ?? '', t.color ?? '#7ec8e3', t.projectId ?? null, t.folderId ?? null, t.isVisible ?? true, t.createdAt ?? null,
        t.updatedAt ?? t.createdAt ?? nowIso,
      ],
      'updated_at', userId
    );

    await reconcileTable(
      client, 'system_logs', incoming.pomodoroSessions ?? [],
      ['id', 'task_id', 'task_title', 'type', 'duration', 'start_time', 'end_time', 'completed'],
      (s) => [
        s.id, s.taskId ?? null, s.taskTitle ?? null, s.type ?? 'focus',
        s.duration ?? 0, s.startTime ?? null, s.endTime ?? null, s.completed ?? true,
      ],
      null, userId
    );

    await reconcileTable(
      client, 'attachments', incoming.attachments ?? [],
      ['id', 'task_id', 'file_name', 'file_url', 'file_size', 'mime_type', 'created_at', 'updated_at'],
      (a) => [
        a.id, a.taskId, a.fileName ?? 'Unnamed File', a.fileUrl ?? '', a.fileSize ?? 0, a.mimeType ?? '',
        a.createdAt ?? nowIso, a.updatedAt ?? a.createdAt ?? nowIso,
      ],
      'updated_at', userId
    );

    await reconcileTable(
      client, 'pomodoro_records', incoming.pomodoroRecords ?? [],
      ['id', 'task_id', 'task_title', 'start_time', 'end_time', 'break_start', 'break_end', 'completed', 'created_at', 'updated_at', 'is_deleted'],
      (pr) => [
        pr.id, pr.taskId ?? null, pr.taskTitle ?? null, pr.startTime, pr.endTime ?? null, pr.breakStart ?? null, pr.breakEnd ?? null,
        pr.completed ?? false, pr.createdAt ?? nowIso, pr.updatedAt ?? pr.createdAt ?? nowIso, pr.isDeleted ?? false,
      ],
      'updated_at', userId
    );

    // 2. Apply explicit deletes
    const del = incoming.deletedIds ?? {};
    await applyDeletedIds(client, 'tasks', del.tasks, userId);
    await applyDeletedIds(client, 'knowleadge', del.knowledges, userId);
    await applyDeletedIds(client, 'diary', del.diaries, userId);
    await applyDeletedIds(client, 'projects', del.projects, userId);
    await applyDeletedIds(client, 'folders', del.folders, userId);
    await applyDeletedIds(client, 'tags', del.tags, userId);
    await applyDeletedIds(client, 'attachments', del.attachments, userId);
    await applyDeletedIds(client, 'pomodoro_records', del.pomodoroRecords, userId);

    // 3. Settings (ID la userId cua ca nhan)
    if (incoming.settings) {
      const s = incoming.settings;
      await client.query(
        `INSERT INTO settings (
           id, pomodoro_length, short_break_length, long_break_length, long_break_after,
           auto_start_next_pomodoro, auto_start_break, disable_break, alarm_sound,
           dark_mode, theme_wallpaper, accent_color, webhook_url, webhook_enabled,
           external_api_url, external_api_enabled, daily_focus_goal_hours, visible_views,
           calendar_scale, calendar_date_field, user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$1)
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
           visible_views = EXCLUDED.visible_views,
           calendar_scale = EXCLUDED.calendar_scale,
           calendar_date_field = EXCLUDED.calendar_date_field`,
        [
          userId, s.pomodoroLength ?? 25, s.shortBreakLength ?? 5, s.longBreakLength ?? 15,
          s.longBreakAfter ?? 4, s.autoStartNextPomodoro ?? false, s.autoStartBreak ?? false,
          s.disableBreak ?? false, s.alarmSound ?? true, s.darkMode ?? 'dark',
          s.themeWallpaper ?? 'dark-forest', s.accentColor ?? '#f25f5c', s.webhookUrl ?? '',
          s.webhookEnabled ?? false, s.externalApiUrl ?? '', s.externalApiEnabled ?? false,
          s.dailyFocusGoalHours ?? 3, JSON.stringify(s.visibleViews ?? {}),
          s.calendarScale ?? 'month', s.calendarDateField ?? 'dueDate',
        ],
      );
    }

    // 4. UI State (ID la userId cua ca nhan)
    await client.query(
      `INSERT INTO ui_state (id, selected_task_id, active_view, active_project_id, search_query, user_id)
       VALUES ($1,$2,$3,$4,$5,$1)
       ON CONFLICT (id) DO UPDATE SET
         selected_task_id = EXCLUDED.selected_task_id,
         active_view = EXCLUDED.active_view,
         active_project_id = EXCLUDED.active_project_id,
         search_query = EXCLUDED.search_query`,
      [
        userId,
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

// GET /api/state
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [tasks, knowledges, diaries, projects, folders, tags, settings, ui, sessions, attachments, pomodoroRecords] = await Promise.all([
      pool.query('SELECT * FROM tasks WHERE (is_deleted = false OR is_deleted IS NULL) AND user_id = $1 ORDER BY position ASC, created_at DESC', [userId]),
      pool.query('SELECT * FROM knowleadge WHERE (is_deleted = false OR is_deleted IS NULL) AND user_id = $1 ORDER BY position ASC, created_at DESC', [userId]),
      pool.query('SELECT * FROM diary WHERE (is_deleted = false OR is_deleted IS NULL) AND user_id = $1 ORDER BY position ASC, created_at DESC', [userId]),
      pool.query('SELECT * FROM projects WHERE (is_deleted = false OR is_deleted IS NULL) AND user_id = $1 ORDER BY position ASC, created_at ASC', [userId]),
      pool.query('SELECT * FROM folders WHERE (is_deleted = false OR is_deleted IS NULL) AND user_id = $1 ORDER BY position ASC, created_at ASC', [userId]),
      pool.query('SELECT * FROM tags WHERE (is_deleted = false OR is_deleted IS NULL) AND user_id = $1 ORDER BY created_at ASC', [userId]),
      pool.query('SELECT * FROM settings WHERE user_id = $1 OR id = $1', [userId]),
      pool.query('SELECT * FROM ui_state WHERE user_id = $1 OR id = $1', [userId]),
      pool.query('SELECT * FROM system_logs WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM attachments WHERE (is_deleted = false OR is_deleted IS NULL) AND user_id = $1', [userId]),
      pool.query('SELECT * FROM pomodoro_records WHERE (is_deleted = false OR is_deleted IS NULL) AND user_id = $1 ORDER BY created_at DESC', [userId]),
    ]);

    const uiRow = ui.rows[0] ?? {};

    const state = {
      tasks: tasks.rows.map(rowToTask),
      knowledges: knowledges.rows.map(rowToKnowledge),
      diaries: diaries.rows.map(rowToDiary),
      projects: projects.rows.map(rowToProject),
      folders: folders.rows.map(rowToFolder),
      tags: tags.rows.map(rowToTag),
      settings: settings.rows[0] ? rowToSettings(settings.rows[0]) : null,
      pomodoroSessions: sessions.rows.map(rowToSession),
      pomodoroRecords: pomodoroRecords.rows.map(rowToPomodoroRecord),
      attachments: attachments.rows.map(rowToAttachment),
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

// POST /api/state
router.post('/', authenticateUser, async (req, res) => {
  const incoming = req.body.state ?? req.body;
  const userId = req.user.id;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await persistState(incoming, userId);
      return res.json({ status: 'ok' });
    } catch (error) {
      if (error.code === '40P01' && attempt < maxAttempts) {
        await sleep(50 + Math.random() * 100);
        continue;
      }
      console.error('Failed to save remote state:', error);
      return res.status(500).json({ error: 'Failed to save remote state' });
    }
  }
});

export default router;
