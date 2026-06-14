import { Router } from 'express';
import { rowToTask } from '../src/backend/modules/tasks/task.service.js';

// ============================================================
// Delta feed: GET /api/changes?since=<ISO>&types=tasks,projects,folders,tags
// Returns rows with updated_at > since. Live rows -> changes; deleted rows
// tombstone (is_deleted) -> deletedIds. Used by SPA to catch up with writes from external apps
// without reloading. Wraps updated_at + is_deleted, no need for a separate changes table.
// ============================================================
function rowToKnowledge(r) {
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
  };
}

function rowToProject(r) {
  return {
    id: r.id, name: r.name ?? '', color: r.color ?? '#7ec8e3',
    isVisible: r.is_visible ?? true, taskCount: r.task_count ?? 0,
    folderId: r.folder_id ?? null, position: r.position ?? 0,
    createdAt: r.created_at ?? null, updatedAt: r.updated_at ?? null,
  };
}
function rowToFolder(r) {
  return {
    id: r.id, name: r.name ?? '', color: r.color ?? '#7ec8e3',
    projectIds: r.project_ids ?? [], parentId: r.parent_id ?? null, position: r.position ?? 0,
    createdAt: r.created_at ?? null, updatedAt: r.updated_at ?? null,
  };
}
function rowToTag(r) {
  return {
    id: r.id, name: r.name ?? '', color: r.color ?? '#7ec8e3',
    projectId: r.project_id ?? null, folderId: r.folder_id ?? null,
    createdAt: r.created_at ?? null, updatedAt: r.updated_at ?? null,
  };
}
function rowToPomodoroRecord(r) {
  return {
    id: r.id,
    taskId: r.task_id ?? null,
    taskTitle: r.task_title ?? null,
    startTime: r.start_time,
    endTime: r.end_time ?? null,
    breakStart: r.break_start ?? null,
    breakEnd: r.break_end ?? null,
    completed: r.completed ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isDeleted: r.is_deleted ?? false,
  };
}

const MAPPERS = { tasks: rowToTask, knowledges: rowToKnowledge, projects: rowToProject, folders: rowToFolder, tags: rowToTag, pomodoro_records: rowToPomodoroRecord };
const ALL_TYPES = ['tasks', 'knowledges', 'projects', 'folders', 'tags', 'pomodoro_records'];

export function createChangesRouter(pool, auth) {
  const router = Router();
  router.get('/', auth.requireScope('changes:read'), async (req, res) => {
    const since = typeof req.query.since === 'string' && req.query.since ? req.query.since : null;
    const types = typeof req.query.types === 'string' && req.query.types
      ? req.query.types.split(',').map((s) => s.trim()).filter((t) => ALL_TYPES.includes(t))
      : ALL_TYPES;

    const now = new Date().toISOString();
    const changes = {};
    const deletedIds = {};
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      for (const table of types) {
        const mapper = MAPPERS[table];
        let rows;
        const tableName = table === 'knowledges' ? 'knowleadge' : table;
        if (since) {
          rows = await pool.query(
            `SELECT * FROM ${tableName} WHERE updated_at > $1 AND user_id = $2 ORDER BY updated_at ASC LIMIT 2000`,
            [since, userId],
          );
        } else {
          rows = await pool.query(
            `SELECT * FROM ${tableName} WHERE (is_deleted = false OR is_deleted IS NULL) AND user_id = $1 ORDER BY updated_at ASC LIMIT 2000`,
            [userId],
          );
        }
        const live = [];
        const dead = [];
        for (const r of rows.rows) {
          if (r.is_deleted === true) dead.push(r.id);
          else live.push(mapper(r));
        }
        changes[table] = live;
        deletedIds[table] = dead;
      }
      res.json({ now, changes, deletedIds });
    } catch (err) {
      console.error('[GET /api/changes]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
