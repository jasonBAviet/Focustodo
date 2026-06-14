import { Router } from 'express';
import crypto from 'crypto';
import { taskService } from '../src/backend/modules/tasks/task.service.js';

// ============================================================
// Inbound webhook receiver: POST /api/hooks/:integration
// ------------------------------------------------------------
// NOTE: this router receives RAW body (Buffer) because server.js mounted
// express.raw() ONLY for /api/hooks (raw is needed for standard HMAC validation).
// Maps external payload -> task via configuration in the webhook_endpoints table.
// ============================================================

function verifyHmac(secret, rawBuf, signatureHeader) {
  if (!secret) return false; // secret and signature validation are mandatory
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
        return res.status(404).json({ error: `Integration "${integration}" does not exist or is disabled.` });
      }

      // req.body is Buffer (express.raw). Can be empty if no body.
      const rawBuf = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
      if (!ep.secret) {
        return res.status(503).json({ error: `Endpoint "${integration}" has no secret configured. Please update the secret via /api/integrations before use.` });
      }
      const signature = req.headers['x-signature'] || req.headers['x-hub-signature-256'];
      if (!verifyHmac(ep.secret, rawBuf, signature)) {
        return res.status(401).json({ error: 'Invalid HMAC signature.' });
      }

      let payload;
      try {
        payload = rawBuf.length ? JSON.parse(rawBuf.toString('utf8')) : {};
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body.' });
      }

      const mapped = mapPayloadToTask(payload, ep.mapping, ep.default_project_id);
      if (!mapped.title || String(mapped.title).trim() === '') {
        return res.status(400).json({ error: 'Could not map "title" from the payload.' });
      }

      if (!ep.user_id) {
        return res.status(400).json({ error: `Endpoint "${integration}" has no user_id configured. Please update via /api/integrations.` });
      }
      const { data: task } = await taskService.createTask(ep.user_id, mapped);
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
// Manage inbound endpoint configuration (admin / same-origin SPA).
// Mounted at /api/integrations (normal JSON parser, NOT raw).
// ============================================================
export function createIntegrationsRouter(pool, auth) {
  const router = Router();
  router.use(auth.requireAdmin);

  router.get('/', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'default_user';
      // Do not return raw secret.
      const r = await pool.query(
        `SELECT integration, mapping, default_project_id, enabled, created_at, last_used_at, (secret IS NOT NULL AND secret <> '') AS has_secret 
         FROM webhook_endpoints 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );
      res.json({ data: r.rows });
    } catch (err) {
      console.error('[GET /api/integrations]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create/update endpoint (upsert by integration).
  router.post('/', async (req, res) => {
    const body = req.body ?? {};
    const integration = String(body.integration ?? '').trim();
    if (!integration) return res.status(400).json({ error: '"integration" field is required.' });
    try {
      const userId = req.user?.id ?? 'default_user';
      const now = new Date().toISOString();
      const secret = body.secret ?? crypto.randomBytes(24).toString('hex');
      await pool.query(
        `INSERT INTO webhook_endpoints (integration, secret, mapping, default_project_id, enabled, created_at, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (integration) DO UPDATE SET
           secret = COALESCE(EXCLUDED.secret, webhook_endpoints.secret),
           mapping = EXCLUDED.mapping,
           default_project_id = EXCLUDED.default_project_id,
           enabled = EXCLUDED.enabled,
           user_id = EXCLUDED.user_id`,
        [
          integration,
          secret,
          JSON.stringify(body.mapping ?? {}),
          body.defaultProjectId ?? null,
          body.enabled ?? true,
          now,
          userId,
        ],
      );
      res.status(201).json({
        integration,
        secret, // return secret to configure the sender (only shown upon creation/update)
        webhookUrl: `/api/hooks/${integration}`,
        note: 'Sender sets header X-Signature = HMAC-SHA256(secret, rawBody) hex.',
      });
    } catch (err) {
      console.error('[POST /api/integrations]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:integration', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'default_user';
      const r = await pool.query(
        'DELETE FROM webhook_endpoints WHERE integration = $1 AND user_id = $2 RETURNING integration', 
        [req.params.integration, userId]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Integration not found' });
      res.json({ data: { integration: r.rows[0].integration }, message: 'Integration deleted.' });
    } catch (err) {
      console.error('[DELETE /api/integrations/:integration]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
