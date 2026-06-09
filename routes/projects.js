import { Router } from 'express';
import { randomUUID } from 'crypto';

// ============================================================
// Public Projects API (scoped: projects:read / projects:write)
// ============================================================
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

export function createProjectsRouter(pool, auth) {
  const router = Router();
  const requireRead = auth.requireScope('projects:read');
  const requireWrite = auth.requireScope('projects:write');

  router.get('/', requireRead, async (_req, res) => {
    try {
      const r = await pool.query(
        'SELECT * FROM projects WHERE is_deleted = false OR is_deleted IS NULL ORDER BY position ASC, created_at ASC',
      );
      res.json({ data: r.rows.map(rowToProject) });
    } catch (err) {
      console.error('[GET /api/projects]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/reorder', requireWrite, async (req, res) => {
    const { orderedIds } = req.body ?? {};
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds[] la bat buoc.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query('UPDATE projects SET position = $1, updated_at = $2 WHERE id = $3', [i, now, orderedIds[i]]);
      }
      await client.query('COMMIT');
      res.json({ status: 'ok', count: orderedIds.length });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[POST /api/projects/reorder]', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  router.get('/:id', requireRead, async (req, res) => {
    try {
      const r = await pool.query(
        'SELECT * FROM projects WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [req.params.id],
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Project khong tim thay' });
      res.json({ data: rowToProject(r.rows[0]) });
    } catch (err) {
      console.error('[GET /api/projects/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', requireWrite, async (req, res) => {
    const body = req.body ?? {};
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return res.status(400).json({ error: 'Truong "name" la bat buoc.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      const id = body.id ?? randomUUID();
      const folderId = body.folderId ?? null;
      const posQ = await client.query(
        'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM projects WHERE folder_id IS NOT DISTINCT FROM $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [folderId],
      );
      const position = posQ.rows[0].pos;
      const r = await client.query(
        `INSERT INTO projects (id, name, color, is_visible, task_count, folder_id, position, created_at, updated_at)
         VALUES ($1,$2,$3,$4,0,$5,$6,$7,$7) RETURNING *`,
        [id, body.name.trim(), body.color ?? '#7ec8e3', body.isVisible ?? true, folderId, position, now],
      );
      // Liên kết vào folder (mirror addProject ở client).
      if (folderId) {
        await client.query(
          `UPDATE folders SET project_ids = (
             SELECT jsonb_agg(DISTINCT e) FROM jsonb_array_elements(COALESCE(project_ids,'[]'::jsonb) || to_jsonb($2::text)) e
           ), updated_at = $3 WHERE id = $1`,
          [folderId, id, now],
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ data: rowToProject(r.rows[0]) });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (err.code === '23505') return res.status(409).json({ error: 'Project id da ton tai.' });
      console.error('[POST /api/projects]', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  router.put('/:id', requireWrite, async (req, res) => {
    const { id } = req.params;
    const body = req.body ?? {};
    try {
      const existing = await pool.query(
        'SELECT * FROM projects WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [id],
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Project khong tim thay' });
      const cur = existing.rows[0];
      const now = new Date().toISOString();
      const r = await pool.query(
        `UPDATE projects SET name=$1, color=$2, is_visible=$3, folder_id=$4, position=$5, updated_at=$6
         WHERE id=$7 RETURNING *`,
        [
          body.name ?? cur.name,
          body.color ?? cur.color,
          'isVisible' in body ? body.isVisible : cur.is_visible,
          'folderId' in body ? body.folderId : cur.folder_id,
          'position' in body ? body.position : cur.position,
          now,
          id,
        ],
      );
      res.json({ data: rowToProject(r.rows[0]) });
    } catch (err) {
      console.error('[PUT /api/projects/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE: soft-delete project, gỡ khỏi folder.project_ids, set tasks.project_id=null
  router.delete('/:id', requireWrite, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      const r = await client.query(
        'UPDATE projects SET is_deleted = true, updated_at = $2 WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL) RETURNING id',
        [id, now],
      );
      if (r.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Project khong tim thay' });
      }
      await client.query(
        `UPDATE folders SET project_ids = COALESCE(project_ids,'[]'::jsonb) - $1, updated_at = $2
         WHERE project_ids @> to_jsonb($1::text)`,
        [id, now],
      );
      await client.query(
        'UPDATE tasks SET project_id = NULL, updated_at = $2 WHERE project_id = $1',
        [id, now],
      );
      await client.query('COMMIT');
      res.json({ data: { id }, message: 'Da xoa project.' });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[DELETE /api/projects/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  return router;
}
