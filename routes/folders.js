import { Router } from 'express';
import { randomUUID } from 'crypto';

// ============================================================
// Public Folders API (scoped: folders:read / folders:write)
// ============================================================
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

export function createFoldersRouter(pool, auth) {
  const router = Router();
  const requireRead = auth.requireScope('folders:read');
  const requireWrite = auth.requireScope('folders:write');

  router.get('/', requireRead, async (_req, res) => {
    try {
      const r = await pool.query(
        'SELECT * FROM folders WHERE is_deleted = false OR is_deleted IS NULL ORDER BY position ASC, created_at ASC',
      );
      res.json({ data: r.rows.map(rowToFolder) });
    } catch (err) {
      console.error('[GET /api/folders]', err);
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
        await client.query('UPDATE folders SET position = $1, updated_at = $2 WHERE id = $3', [i, now, orderedIds[i]]);
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

  router.get('/:id', requireRead, async (req, res) => {
    try {
      const r = await pool.query(
        'SELECT * FROM folders WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [req.params.id],
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Folder khong tim thay' });
      res.json({ data: rowToFolder(r.rows[0]) });
    } catch (err) {
      console.error('[GET /api/folders/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', requireWrite, async (req, res) => {
    const body = req.body ?? {};
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return res.status(400).json({ error: 'Truong "name" la bat buoc.' });
    }
    try {
      const now = new Date().toISOString();
      const id = body.id ?? randomUUID();
      const posQ = await pool.query(
        'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM folders WHERE is_deleted = false OR is_deleted IS NULL',
      );
      const r = await pool.query(
        `INSERT INTO folders (id, name, color, project_ids, parent_id, position, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
        [id, body.name.trim(), body.color ?? '#7ec8e3', JSON.stringify(body.projectIds ?? []), body.parentId ?? null, posQ.rows[0].pos, now],
      );
      res.status(201).json({ data: rowToFolder(r.rows[0]) });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Folder id da ton tai.' });
      console.error('[POST /api/folders]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/:id', requireWrite, async (req, res) => {
    const { id } = req.params;
    const body = req.body ?? {};
    try {
      const existing = await pool.query(
        'SELECT * FROM folders WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [id],
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Folder khong tim thay' });
      const cur = existing.rows[0];
      const now = new Date().toISOString();
      // Chống chu trình: không cho đặt parent là chính nó.
      const nextParent = 'parentId' in body ? body.parentId : cur.parent_id;
      if (nextParent === id) {
        return res.status(400).json({ error: 'Folder khong the la cha cua chinh no.' });
      }
      const r = await pool.query(
        `UPDATE folders SET name=$1, color=$2, project_ids=$3, parent_id=$4, position=$5, updated_at=$6 WHERE id=$7 RETURNING *`,
        [
          body.name ?? cur.name,
          body.color ?? cur.color,
          'projectIds' in body ? JSON.stringify(body.projectIds) : cur.project_ids,
          nextParent ?? null,
          'position' in body ? body.position : cur.position,
          now,
          id,
        ],
      );
      res.json({ data: rowToFolder(r.rows[0]) });
    } catch (err) {
      console.error('[PUT /api/folders/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE: soft-delete folder, set folder_id=null cho project con (mirror client).
  router.delete('/:id', requireWrite, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      const r = await client.query(
        'UPDATE folders SET is_deleted = true, updated_at = $2 WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL) RETURNING id',
        [id, now],
      );
      if (r.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Folder khong tim thay' });
      }
      await client.query('UPDATE projects SET folder_id = NULL, updated_at = $2 WHERE folder_id = $1', [id, now]);
      // Đưa các folder con lên gốc (parent_id = null) thay vì xoá theo.
      await client.query('UPDATE folders SET parent_id = NULL, updated_at = $2 WHERE parent_id = $1', [id, now]);
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
