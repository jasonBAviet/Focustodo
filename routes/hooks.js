import { Router } from 'express';
import crypto from 'crypto';
import { insertTaskRow } from './taskHelpers.js';

// ============================================================
// Inbound webhook receiver: POST /api/hooks/:integration
// ------------------------------------------------------------
// LƯU Ý: router này nhận RAW body (Buffer) vì server.js đã mount
// express.raw() CHỈ cho /api/hooks (cần raw để xác thực HMAC chuẩn).
// Map payload ngoài -> task qua cấu hình trong bảng webhook_endpoints.
// ============================================================

function verifyHmac(secret, rawBuf, signatureHeader) {
  if (!secret) return true; // endpoint không đặt secret -> bỏ qua xác thực
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBuf).digest('hex');
  const provided = String(signatureHeader).replace(/^sha256=/i, '').trim();
  const a = Buffer.from(expected, 'hex');
  let b;
  try {
    b = Buffer.from(provided, 'hex');
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getPath(obj, key) {
  if (!key) return undefined;
  return String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function mapPayloadToTask(payload, mapping, defaultProjectId) {
  const m = mapping && typeof mapping === 'object' ? mapping : {};
  const pick = (field, ...fallbacks) => {
    const mapped = m[field] ? getPath(payload, m[field]) : undefined;
    if (mapped !== undefined) return mapped;
    for (const f of fallbacks) if (f !== undefined) return f;
    return undefined;
  };
  return {
    title: pick('title', payload.title, payload.text, payload.subject) ?? '',
    note: pick('note', payload.note, payload.body, payload.description) ?? '',
    priority: pick('priority', payload.priority) ?? 'none',
    dueDate: pick('dueDate', payload.dueDate, payload.due) ?? null,
    projectId: pick('projectId', payload.projectId) ?? defaultProjectId ?? null,
    tags: pick('tags', payload.tags) ?? [],
  };
}

export function createHooksRouter(pool) {
  const router = Router();

  router.post('/:integration', async (req, res) => {
    const { integration } = req.params;
    try {
      const epQ = await pool.query('SELECT * FROM webhook_endpoints WHERE integration = $1', [integration]);
      const ep = epQ.rows[0];
      if (!ep || ep.enabled === false) {
        return res.status(404).json({ error: `Integration "${integration}" khong ton tai hoac da tat.` });
      }

      // req.body là Buffer (express.raw). Có thể rỗng nếu không có body.
      const rawBuf = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
      const signature = req.headers['x-signature'] || req.headers['x-hub-signature-256'];
      if (!verifyHmac(ep.secret, rawBuf, signature)) {
        return res.status(401).json({ error: 'Chu ky HMAC khong hop le.' });
      }

      let payload;
      try {
        payload = rawBuf.length ? JSON.parse(rawBuf.toString('utf8')) : {};
      } catch {
        return res.status(400).json({ error: 'Body khong phai JSON hop le.' });
      }

      const mapped = mapPayloadToTask(payload, ep.mapping, ep.default_project_id);
      if (!mapped.title || String(mapped.title).trim() === '') {
        return res.status(400).json({ error: 'Khong map duoc "title" tu payload.' });
      }

      const task = await insertTaskRow(pool, mapped);
      pool
        .query('UPDATE webhook_endpoints SET last_used_at = $1 WHERE integration = $2', [new Date().toISOString(), integration])
        .catch(() => {});
      res.status(201).json({ data: task });
    } catch (err) {
      console.error('[POST /api/hooks/:integration]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

// ============================================================
// Quản lý cấu hình inbound endpoint (admin / SPA cùng origin).
// Mount ở /api/integrations (JSON parser bình thường, KHÔNG raw).
// ============================================================
export function createIntegrationsRouter(pool, auth) {
  const router = Router();
  router.use(auth.requireAdmin);

  router.get('/', async (_req, res) => {
    try {
      // Không trả secret thô.
      const r = await pool.query(
        'SELECT integration, mapping, default_project_id, enabled, created_at, last_used_at, (secret IS NOT NULL AND secret <> \'\') AS has_secret FROM webhook_endpoints ORDER BY created_at DESC',
      );
      res.json({ data: r.rows });
    } catch (err) {
      console.error('[GET /api/integrations]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Tạo/cập nhật endpoint (upsert theo integration).
  router.post('/', async (req, res) => {
    const body = req.body ?? {};
    const integration = String(body.integration ?? '').trim();
    if (!integration) return res.status(400).json({ error: 'Truong "integration" la bat buoc.' });
    try {
      const now = new Date().toISOString();
      const secret = body.secret ?? crypto.randomBytes(24).toString('hex');
      await pool.query(
        `INSERT INTO webhook_endpoints (integration, secret, mapping, default_project_id, enabled, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (integration) DO UPDATE SET
           secret = COALESCE(EXCLUDED.secret, webhook_endpoints.secret),
           mapping = EXCLUDED.mapping,
           default_project_id = EXCLUDED.default_project_id,
           enabled = EXCLUDED.enabled`,
        [
          integration,
          secret,
          JSON.stringify(body.mapping ?? {}),
          body.defaultProjectId ?? null,
          body.enabled ?? true,
          now,
        ],
      );
      res.status(201).json({
        integration,
        secret, // trả secret để cấu hình bên gửi (chỉ hiện khi tạo/cập nhật)
        webhookUrl: `/api/hooks/${integration}`,
        note: 'Bên gửi đặt header X-Signature = HMAC-SHA256(secret, rawBody) hex.',
      });
    } catch (err) {
      console.error('[POST /api/integrations]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:integration', async (req, res) => {
    try {
      const r = await pool.query('DELETE FROM webhook_endpoints WHERE integration = $1 RETURNING integration', [req.params.integration]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Integration khong tim thay' });
      res.json({ data: { integration: r.rows[0].integration }, message: 'Da xoa integration.' });
    } catch (err) {
      console.error('[DELETE /api/integrations/:integration]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
