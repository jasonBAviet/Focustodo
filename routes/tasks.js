import { Router } from 'express';
import {
  rowToTask,
  insertTaskRow,
  spawnNextOccurrence,
  VALID_PRIORITIES,
  VALID_REPEATS,
} from './taskHelpers.js';

// ============================================================
// Public Task API - nhan/cung cap task cho he thong ben ngoai.
// Auth + scope do server truyền vào (routes/auth.js).
// ============================================================
export function createTasksRouter(pool, auth) {
  const router = Router();
  const requireRead = auth.requireScope('tasks:read');
  const requireWrite = auth.requireScope('tasks:write');

  // ----------------------------------------------------------
  // GET /api/tasks  (query: projectId, priority, completed, dueDate, limit, offset)
  // ----------------------------------------------------------
  router.get('/', requireRead, async (req, res) => {
    try {
      const conditions = [];
      const params = [];
      const { projectId, priority, completed, dueDate, limit = 100, offset = 0 } = req.query;

      if (projectId) {
        params.push(projectId);
        conditions.push(`project_id = $${params.length}`);
      }
      if (priority) {
        if (!VALID_PRIORITIES.includes(priority)) {
          return res.status(400).json({ error: `priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}` });
        }
        params.push(priority);
        conditions.push(`priority = $${params.length}`);
      }
      if (completed !== undefined) {
        params.push(completed === 'true');
        conditions.push(`completed = $${params.length}`);
      }
      if (dueDate) {
        params.push(dueDate);
        conditions.push(`due_date = $${params.length}`);
      }
      conditions.push(`(is_deleted = false OR is_deleted IS NULL)`);
      const where = `WHERE ${conditions.join(' AND ')}`;
      const limitVal = Math.min(Number(limit) || 100, 500);
      const offsetVal = Number(offset) || 0;

      const result = await pool.query(
        `SELECT * FROM tasks ${where} ORDER BY position ASC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitVal, offsetVal],
      );
      const countResult = await pool.query(`SELECT count(*)::int AS total FROM tasks ${where}`, params);

      res.json({
        data: result.rows.map(rowToTask),
        total: countResult.rows[0].total,
        limit: limitVal,
        offset: offsetVal,
      });
    } catch (err) {
      console.error('[GET /api/tasks]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ----------------------------------------------------------
  // POST /api/tasks/reorder  { projectId?, orderedIds[] }
  // (định nghĩa trước /:id để tránh nhầm route)
  // ----------------------------------------------------------
  router.post('/reorder', requireWrite, async (req, res) => {
    const { orderedIds } = req.body ?? {};
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds[] la bat buoc.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query('UPDATE tasks SET position = $1, updated_at = $2 WHERE id = $3', [i, now, orderedIds[i]]);
      }
      await client.query('COMMIT');
      res.json({ status: 'ok', count: orderedIds.length });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[POST /api/tasks/reorder]', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // ----------------------------------------------------------
  // GET /api/tasks/:id
  // ----------------------------------------------------------
  router.get('/:id', requireRead, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [req.params.id],
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Task khong tim thay' });
      res.json({ data: rowToTask(result.rows[0]) });
    } catch (err) {
      console.error('[GET /api/tasks/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ----------------------------------------------------------
  // POST /api/tasks - tao task moi
  // ----------------------------------------------------------
  router.post('/', requireWrite, async (req, res) => {
    const body = req.body ?? {};
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return res.status(400).json({ error: 'Truong "title" la bat buoc va khong duoc rong.' });
    }
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return res.status(400).json({ error: `priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}` });
    }
    if (body.repeat && !VALID_REPEATS.includes(body.repeat)) {
      return res.status(400).json({ error: `repeat phai la mot trong: ${VALID_REPEATS.join(', ')}` });
    }
    try {
      if (body.projectId) {
        const proj = await pool.query('SELECT id FROM projects WHERE id = $1', [body.projectId]);
        if (proj.rows.length === 0) {
          return res.status(400).json({ error: `Project "${body.projectId}" khong ton tai.` });
        }
      }
      const task = await insertTaskRow(pool, body);
      res.status(201).json({ data: task });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: `Task voi id "${body.id}" da ton tai.` });
      }
      console.error('[POST /api/tasks]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ----------------------------------------------------------
  // PATCH /api/tasks/:id/complete  { completed?: boolean }
  // Hoàn thành (mặc định true). Nếu chuyển false->true và task lặp -> sinh
  // occurrence kế tiếp (1 điểm sinh duy nhất; idempotent theo transition).
  // ----------------------------------------------------------
  router.patch('/:id/complete', requireWrite, async (req, res) => {
    const { id } = req.params;
    const completed = req.body?.completed !== false;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        'SELECT * FROM tasks WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [id],
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Task khong tim thay' });
      }
      const cur = existing.rows[0];
      const now = new Date().toISOString();
      const wasCompleted = cur.completed === true;
      const completedAt = completed ? cur.completed_at ?? now : null;

      const upd = await client.query(
        'UPDATE tasks SET completed = $1, completed_at = $2, updated_at = $3 WHERE id = $4 RETURNING *',
        [completed, completedAt, now, id],
      );

      let spawned = null;
      if (completed && !wasCompleted && cur.repeat && cur.repeat !== 'none') {
        spawned = await spawnNextOccurrence(client, cur);
      }
      await client.query('COMMIT');
      res.json({ data: rowToTask(upd.rows[0]), spawned });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[PATCH /api/tasks/:id/complete]', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // ----------------------------------------------------------
  // PUT /api/tasks/:id - cap nhat task (partial)
  // ----------------------------------------------------------
  router.put('/:id', requireWrite, async (req, res) => {
    const { id } = req.params;
    const body = req.body ?? {};
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return res.status(400).json({ error: `priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}` });
    }
    if (body.repeat && !VALID_REPEATS.includes(body.repeat)) {
      return res.status(400).json({ error: `repeat phai la mot trong: ${VALID_REPEATS.join(', ')}` });
    }
    try {
      const existing = await pool.query(
        'SELECT * FROM tasks WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [id],
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Task khong tim thay' });

      const now = new Date().toISOString();
      const cur = existing.rows[0];
      const wasCompleted = cur.completed === true;

      const updated = {
        title: body.title ?? cur.title,
        project_id: 'projectId' in body ? body.projectId : cur.project_id,
        priority: body.priority ?? cur.priority,
        due_date: 'dueDate' in body ? body.dueDate : cur.due_date,
        reminder: 'reminder' in body ? body.reminder : cur.reminder,
        repeat: body.repeat ?? cur.repeat,
        repeat_custom: 'repeatCustom' in body ? body.repeatCustom : cur.repeat_custom,
        note: 'note' in body ? body.note : cur.note,
        subtasks: 'subtasks' in body ? JSON.stringify(body.subtasks) : cur.subtasks,
        pomodoro_estimate: body.pomodoroEstimate ?? cur.pomodoro_estimate,
        completed: 'completed' in body ? body.completed : cur.completed,
        flagged: 'flagged' in body ? body.flagged : cur.flagged,
        tags: 'tags' in body ? JSON.stringify(body.tags) : cur.tags,
        position: 'position' in body ? body.position : cur.position,
        completed_at: 'completed' in body ? (body.completed ? cur.completed_at ?? now : null) : cur.completed_at,
        updated_at: now,
      };

      const result = await pool.query(
        `UPDATE tasks SET
          title=$1, project_id=$2, priority=$3, due_date=$4, reminder=$5,
          repeat=$6, repeat_custom=$7, note=$8, subtasks=$9, pomodoro_estimate=$10,
          completed=$11, flagged=$12, tags=$13, position=$14, completed_at=$15, updated_at=$16
         WHERE id=$17 RETURNING *`,
        [
          updated.title, updated.project_id, updated.priority, updated.due_date,
          updated.reminder, updated.repeat, updated.repeat_custom, updated.note,
          updated.subtasks, updated.pomodoro_estimate, updated.completed,
          updated.flagged, updated.tags, updated.position, updated.completed_at, updated.updated_at, id,
        ],
      );

      // Nếu PUT này hoàn thành 1 task lặp (false->true) -> cũng sinh occurrence.
      let spawned = null;
      if ('completed' in body && body.completed === true && !wasCompleted && cur.repeat && cur.repeat !== 'none') {
        spawned = await spawnNextOccurrence(pool, cur);
      }
      res.json({ data: rowToTask(result.rows[0]), spawned });
    } catch (err) {
      console.error('[PUT /api/tasks/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ----------------------------------------------------------
  // DELETE /api/tasks/:id (soft-delete + bump updated_at cho changes-feed)
  // ----------------------------------------------------------
  router.delete('/:id', requireWrite, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const result = await pool.query(
        'UPDATE tasks SET is_deleted = true, updated_at = $2 WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL) RETURNING id',
        [req.params.id, now],
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Task khong tim thay' });
      res.json({ data: { id: result.rows[0].id }, message: 'Da xoa task thanh cong.' });
    } catch (err) {
      console.error('[DELETE /api/tasks/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
