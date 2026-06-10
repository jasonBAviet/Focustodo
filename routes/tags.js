import { Router } from 'express';
import { randomUUID } from 'crypto';

// ============================================================
// Public Tags API (scoped: tags:read / tags:write)
// ============================================================
function rowToTag(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    projectId: r.project_id ?? null,
    folderId: r.folder_id ?? null,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export function createTagsRouter(pool, auth) {
  const router = Router();
  const requireRead = auth.requireScope('tags:read');
  const requireWrite = auth.requireScope('tags:write');

  router.get('/', requireRead, async (_req, res) => {
    try {
      const r = await pool.query(
        'SELECT * FROM tags WHERE is_deleted = false OR is_deleted IS NULL ORDER BY created_at ASC',
      );
      res.json({ data: r.rows.map(rowToTag) });
    } catch (err) {
      console.error('[GET /api/tags]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id', requireRead, async (req, res) => {
    try {
      const r = await pool.query(
        'SELECT * FROM tags WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [req.params.id],
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Tag khong tim thay' });
      res.json({ data: rowToTag(r.rows[0]) });
    } catch (err) {
      console.error('[GET /api/tags/:id]', err);
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
      const r = await pool.query(
        `INSERT INTO tags (id, name, color, project_id, folder_id, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
        [id, body.name.trim(), body.color ?? '#7ec8e3', body.projectId ?? null, body.folderId ?? null, now],
      );
      res.status(201).json({ data: rowToTag(r.rows[0]) });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Tag id da ton tai.' });
      console.error('[POST /api/tags]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/:id', requireWrite, async (req, res) => {
    const { id } = req.params;
    const body = req.body ?? {};
    try {
      const existing = await pool.query(
        'SELECT * FROM tags WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [id],
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Tag khong tim thay' });
      const cur = existing.rows[0];
      const now = new Date().toISOString();
      // Cho phép xoá phạm vi bằng cách gửi null tường minh ('key' in body).
      const projectId = 'projectId' in body ? body.projectId : cur.project_id;
      const folderId = 'folderId' in body ? body.folderId : cur.folder_id;
      const r = await pool.query(
        `UPDATE tags SET name=$1, color=$2, project_id=$3, folder_id=$4, updated_at=$5 WHERE id=$6 RETURNING *`,
        [body.name ?? cur.name, body.color ?? cur.color, projectId ?? null, folderId ?? null, now, id],
      );
      res.json({ data: rowToTag(r.rows[0]) });
    } catch (err) {
      console.error('[PUT /api/tags/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE: soft-delete tag, gỡ tag id khỏi tasks.tags (mirror client).
  router.delete('/:id', requireWrite, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      const r = await client.query(
        'UPDATE tags SET is_deleted = true, updated_at = $2 WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL) RETURNING id',
        [id, now],
      );
      if (r.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Tag khong tim thay' });
      }
      // jsonb "- text" gỡ phần tử mảng bằng giá trị; chỉ đụng task có chứa tag.
      await client.query(
        `UPDATE tasks SET tags = COALESCE(tags,'[]'::jsonb) - $1, updated_at = $2
         WHERE tags @> to_jsonb($1::text)`,
        [id, now],
      );
      await client.query('COMMIT');
      res.json({ data: { id }, message: 'Da xoa tag.' });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[DELETE /api/tags/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  return router;
}
