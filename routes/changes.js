import { Router } from 'express';
import {
  rowToTask,
  rowToKnowledge,
  rowToDiary,
  rowToProject,
  rowToFolder,
  rowToTag,
  rowToPomodoroRecord,
} from './state-mappers.js';

// ============================================================
// Delta feed: GET /api/changes?since=<ISO>&types=tasks,projects,folders,tags
// Returns rows with updated_at > since. Live rows -> changes; deleted rows
// tombstone (is_deleted) -> deletedIds. Used by SPA to catch up with writes from external apps
// without reloading. Wraps updated_at + is_deleted, no need for a separate changes table.
// ============================================================

const MAPPERS = {
  tasks: rowToTask,
  knowledges: rowToKnowledge,
  diaries: rowToDiary,
  projects: rowToProject,
  folders: rowToFolder,
  tags: rowToTag,
  pomodoro_records: rowToPomodoroRecord,
};

const ALL_TYPES = ['tasks', 'knowledges', 'diaries', 'projects', 'folders', 'tags', 'pomodoro_records'];

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
        const tableName = table === 'knowledges' ? 'knowleadge' : (table === 'diaries' ? 'diary' : table);
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

