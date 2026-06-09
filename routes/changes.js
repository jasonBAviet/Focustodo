import { Router } from 'express';
import { rowToTask } from './taskHelpers.js';

// ============================================================
// Delta feed: GET /api/changes?since=<ISO>&types=tasks,projects,folders,tags
// Trả về các dòng có updated_at > since. Dòng còn sống -> changes; dòng đã
// tombstone (is_deleted) -> deletedIds. SPA dùng để bắt kịp ghi từ app ngoài
// mà không cần reload. Bọc updated_at + is_deleted, không cần bảng changes riêng.
// ============================================================
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
    createdAt: r.created_at ?? null, updatedAt: r.updated_at ?? null,
  };
}

const MAPPERS = { tasks: rowToTask, projects: rowToProject, folders: rowToFolder, tags: rowToTag };
const ALL_TYPES = ['tasks', 'projects', 'folders', 'tags'];

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
      for (const table of types) {
        const mapper = MAPPERS[table];
        let rows;
        if (since) {
          rows = await pool.query(
            `SELECT * FROM ${table} WHERE updated_at > $1 ORDER BY updated_at ASC LIMIT 2000`,
            [since],
          );
        } else {
          rows = await pool.query(
            `SELECT * FROM ${table} WHERE is_deleted = false OR is_deleted IS NULL ORDER BY updated_at ASC LIMIT 2000`,
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
