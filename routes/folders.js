import { Router } from 'express';
import { randomUUID } from 'crypto';

function rowToFolder(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    projectIds: r.project_ids ?? [],
    parentId: r.parent_id ?? null,
    position: r.position ?? 0,
    isVisible: r.is_visible ?? true,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export function createFoldersRouter(pool, auth) {
  const router = Router();
  const requireRead = auth.requireScope('folders:read');
  const requireWrite = auth.requireScope('folders:write');

  // GET /api/folders
  router.get('/', requireRead, async (req, res) => {
    try {
      const userId = req.user.id;
      const r = await pool.query(
        'SELECT * FROM folders WHERE user_id = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY position ASC, created_at ASC',
        [userId]
      );
      res.json({ data: r.rows.map(rowToFolder) });
    } catch (err) {
      console.error('[GET /api/folders]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/folders/reorder
  router.post('/reorder', requireWrite, async (req, res) => {
    const userId = req.user.id;
    const { orderedIds } = req.body ?? {};
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds[] la bat buoc.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE folders SET position = $1, updated_at = $2 WHERE id = $3 AND user_id = $4',
          [i, now, orderedIds[i], userId]
        );
      }
      await client.query('COMMIT');
      res.json({ status: 'ok', count: orderedIds.length });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[POST /api/folders/reorder]', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // GET /api/folders/:id
  router.get('/:id', requireRead, async (req, res) => {
    try {
      const userId = req.user.id;
      const r = await pool.query(
        'SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)',
        [req.params.id, userId],
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Folder khong tim thay' });
      res.json({ data: rowToFolder(r.rows[0]) });
    } catch (err) {
      console.error('[GET /api/folders/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/folders
  router.post('/', requireWrite, async (req, res) => {
    const userId = req.user.id;
    const body = req.body ?? {};
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return res.status(400).json({ error: 'Truong "name" la bat buoc.' });
    }
    try {
      const now = new Date().toISOString();
      const id = body.id ?? randomUUID();
      
      const posQ = await pool.query(
        'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM folders WHERE user_id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [userId]
      );
      
      const r = await pool.query(
        `INSERT INTO folders (id, name, color, project_ids, parent_id, position, is_visible, created_at, updated_at, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9) RETURNING *`,
        [id, body.name.trim(), body.color ?? '#7ec8e3', JSON.stringify(body.projectIds ?? []), body.parentId ?? null, posQ.rows[0].pos, body.isVisible ?? true, now, userId],
      );
      res.status(201).json({ data: rowToFolder(r.rows[0]) });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Folder id da ton tai.' });
      console.error('[POST /api/folders]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/folders/:id
  router.put('/:id', requireWrite, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const body = req.body ?? {};
    try {
      const existing = await pool.query(
        'SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)',
        [id, userId],
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Folder khong tim thay' });
      const cur = existing.rows[0];
      const now = new Date().toISOString();
      const nextParent = 'parentId' in body ? body.parentId : cur.parent_id;
      if (nextParent === id) {
        return res.status(400).json({ error: 'Folder khong the la cha cua chinh no.' });
      }
      const r = await pool.query(
        `UPDATE folders SET name=$1, color=$2, project_ids=$3, parent_id=$4, position=$5, is_visible=$6, updated_at=$7 
         WHERE id=$8 AND user_id=$9 RETURNING *`,
        [
          body.name ?? cur.name,
          body.color ?? cur.color,
          'projectIds' in body ? JSON.stringify(body.projectIds) : cur.project_ids,
          nextParent ?? null,
          'position' in body ? body.position : cur.position,
          'isVisible' in body ? body.isVisible : cur.is_visible,
          now,
          id,
          userId,
        ],
      );
      res.json({ data: rowToFolder(r.rows[0]) });
    } catch (err) {
      console.error('[PUT /api/folders/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE
  router.delete('/:id', requireWrite, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      const r = await client.query(
        'UPDATE folders SET is_deleted = true, updated_at = $2 WHERE id = $1 AND user_id = $3 AND (is_deleted = false OR is_deleted IS NULL) RETURNING id',
        [id, now, userId],
      );
      if (r.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Folder khong tim thay' });
      }
      await client.query('UPDATE projects SET folder_id = NULL, updated_at = $2 WHERE folder_id = $1 AND user_id = $3', [id, now, userId]);
      await client.query('UPDATE folders SET parent_id = NULL, updated_at = $2 WHERE parent_id = $1 AND user_id = $3', [id, now, userId]);
      await client.query('COMMIT');
      res.json({ data: { id }, message: 'Da xoa folder.' });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[DELETE /api/folders/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  return router;
}
