import { Router } from 'express';
import { randomUUID } from 'crypto';

// ============================================================
// API Key Middleware
// ============================================================
// Neu bien moi truong API_KEY duoc dat, bat buoc header X-API-Key.
// Neu chua dat, cho phep qua (mode dev) nhung in canh bao.

const REQUIRED_KEY = process.env.API_KEY ?? '';

if (!REQUIRED_KEY) {
  console.warn('[api-tasks] WARNING: API_KEY is not set. Public task endpoints are unprotected.');
}

function requireApiKey(req, res, next) {
  if (!REQUIRED_KEY) return next(); // mode dev: khong can key
  const provided = req.headers['x-api-key'];
  if (!provided || provided !== REQUIRED_KEY) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing X-API-Key header.' });
  }
  next();
}

// ============================================================
// Mapping helpers
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

const VALID_PRIORITIES = ['high', 'medium', 'low', 'none'];
const VALID_REPEATS = ['none', 'daily', 'weekly', 'monthly', 'custom'];

// ============================================================
// Router factory - nhan pool de truy cap DB
// ============================================================
export function createTasksRouter(pool) {
  const router = Router();

  // Apply API key check cho tat ca routes
  router.use(requireApiKey);

  // ----------------------------------------------------------
  // GET /api/tasks
  // Query params: projectId, priority, completed, dueDate, limit, offset
  // ----------------------------------------------------------
  router.get('/', async (req, res) => {
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
        const boolVal = completed === 'true';
        params.push(boolVal);
        conditions.push(`completed = $${params.length}`);
      }

      if (dueDate) {
        params.push(dueDate);
        conditions.push(`due_date = $${params.length}`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limitVal = Math.min(Number(limit) || 100, 500);
      const offsetVal = Number(offset) || 0;

      const result = await pool.query(
        `SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitVal, offsetVal],
      );

      const countResult = await pool.query(
        `SELECT count(*)::int AS total FROM tasks ${where}`,
        params,
      );

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
  // GET /api/tasks/:id
  // ----------------------------------------------------------
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task khong tim thay' });
      }
      res.json({ data: rowToTask(result.rows[0]) });
    } catch (err) {
      console.error('[GET /api/tasks/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ----------------------------------------------------------
  // POST /api/tasks - tao task moi
  // ----------------------------------------------------------
  router.post('/', async (req, res) => {
    const body = req.body;

    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return res.status(400).json({ error: 'Truong "title" la bat buoc va khong duoc rong.' });
    }

    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return res.status(400).json({ error: `priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}` });
    }

    if (body.repeat && !VALID_REPEATS.includes(body.repeat)) {
      return res.status(400).json({ error: `repeat phai la mot trong: ${VALID_REPEATS.join(', ')}` });
    }

    const now = new Date().toISOString();
    const task = {
      id: body.id ?? randomUUID(),
      title: body.title.trim(),
      project_id: body.projectId ?? null,
      priority: body.priority ?? 'none',
      due_date: body.dueDate ?? null,
      reminder: body.reminder ?? null,
      repeat: body.repeat ?? 'none',
      repeat_custom: body.repeatCustom ?? null,
      note: body.note ?? '',
      subtasks: JSON.stringify(body.subtasks ?? []),
      pomodoro_estimate: body.pomodoroEstimate ?? 1,
      pomodoro_completed: 0,
      total_focus_time: 0,
      completed: false,
      flagged: body.flagged ?? false,
      tags: JSON.stringify(body.tags ?? []),
      created_at: now,
      completed_at: null,
      updated_at: now,
    };

    try {
      // Kiem tra project ton tai neu co cung cap projectId
      if (task.project_id) {
        const proj = await pool.query('SELECT id FROM projects WHERE id = $1', [task.project_id]);
        if (proj.rows.length === 0) {
          return res.status(400).json({ error: `Project "${task.project_id}" khong ton tai.` });
        }
      }

      const result = await pool.query(
        `INSERT INTO tasks
          (id, title, project_id, priority, due_date, reminder, repeat, repeat_custom,
           note, subtasks, pomodoro_estimate, pomodoro_completed, total_focus_time,
           completed, flagged, tags, created_at, completed_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          task.id, task.title, task.project_id, task.priority, task.due_date,
          task.reminder, task.repeat, task.repeat_custom, task.note, task.subtasks,
          task.pomodoro_estimate, task.pomodoro_completed, task.total_focus_time,
          task.completed, task.flagged, task.tags, task.created_at,
          task.completed_at, task.updated_at,
        ],
      );

      res.status(201).json({ data: rowToTask(result.rows[0]) });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: `Task voi id "${task.id}" da ton tai.` });
      }
      console.error('[POST /api/tasks]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ----------------------------------------------------------
  // PUT /api/tasks/:id - cap nhat task
  // ----------------------------------------------------------
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return res.status(400).json({ error: `priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}` });
    }

    if (body.repeat && !VALID_REPEATS.includes(body.repeat)) {
      return res.status(400).json({ error: `repeat phai la mot trong: ${VALID_REPEATS.join(', ')}` });
    }

    try {
      const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Task khong tim thay' });
      }

      const now = new Date().toISOString();
      const cur = existing.rows[0];

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
        completed_at: 'completed' in body
          ? (body.completed ? (cur.completed_at ?? now) : null)
          : cur.completed_at,
        updated_at: now,
      };

      const result = await pool.query(
        `UPDATE tasks SET
          title=$1, project_id=$2, priority=$3, due_date=$4, reminder=$5,
          repeat=$6, repeat_custom=$7, note=$8, subtasks=$9, pomodoro_estimate=$10,
          completed=$11, flagged=$12, tags=$13, completed_at=$14, updated_at=$15
         WHERE id=$16 RETURNING *`,
        [
          updated.title, updated.project_id, updated.priority, updated.due_date,
          updated.reminder, updated.repeat, updated.repeat_custom, updated.note,
          updated.subtasks, updated.pomodoro_estimate, updated.completed,
          updated.flagged, updated.tags, updated.completed_at, updated.updated_at, id,
        ],
      );

      res.json({ data: rowToTask(result.rows[0]) });
    } catch (err) {
      console.error('[PUT /api/tasks/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ----------------------------------------------------------
  // DELETE /api/tasks/:id
  // ----------------------------------------------------------
  router.delete('/:id', async (req, res) => {
    try {
      const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task khong tim thay' });
      }
      res.json({ data: { id: result.rows[0].id }, message: 'Da xoa task thanh cong.' });
    } catch (err) {
      console.error('[DELETE /api/tasks/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
