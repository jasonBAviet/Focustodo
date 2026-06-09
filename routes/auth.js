import { Router } from 'express';
import crypto from 'crypto';
import { randomUUID } from 'crypto';

// ============================================================
// Per-integration API keys + scope checking
// ============================================================
// Mô hình bảo mật (GĐ1, single-user):
//  - SPA cùng origin (trình duyệt của chính chủ) được cho qua mà không cần key,
//    nhận diện qua Sec-Fetch-Site / Origin / Referer. Đây là chốt chặn chống
//    truy cập cross-origin từ trình duyệt; KHÔNG phải tường lửa tuyệt đối với
//    client server-side tự đặt header. Việc siết chặt (session/login) hoãn sang
//    giai đoạn sau — xem plan. Hành vi này KHÔNG làm yếu hơn hiện trạng (API
//    vốn đang mở), mà bổ sung scoped key cho client lập trình bên ngoài.
//  - Client bên ngoài dùng header X-API-Key (đối chiếu SHA-256 với api_keys).
//  - Tương thích ngược với biến môi trường API_KEY (key tĩnh cũ).
//  - Dev pass-through: nếu KHÔNG cấu hình gì (không API_KEY, bảng api_keys rỗng)
//    thì cho qua kèm cảnh báo, giữ trải nghiệm phát triển như trước.

const LEGACY_KEY = process.env.API_KEY ?? '';
const ADMIN_KEY = process.env.ADMIN_KEY ?? '';

export function hashKey(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

const DEV_ORIGINS = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
];

function allowedOrigins() {
  const fromEnv = (process.env.APP_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...fromEnv, ...DEV_ORIGINS];
}

// Yêu cầu đến từ SPA cùng origin (trình duyệt chính chủ) hay không.
function isSameOriginRequest(req) {
  const sfs = req.headers['sec-fetch-site'];
  // Trình duyệt KHÔNG cho JS ghi đè Sec-Fetch-*; same-origin/none là tín hiệu tốt.
  if (sfs === 'same-origin' || sfs === 'none') return true;
  if (sfs === 'cross-site' || sfs === 'cross-origin') return false;

  const src = req.headers.origin || req.headers.referer || '';
  if (!src) return false;
  const allowed = allowedOrigins();
  if (allowed.some((a) => src.startsWith(a))) return true;
  try {
    const u = new URL(src);
    if (req.headers.host && u.host === req.headers.host) return true;
  } catch {
    /* ignore malformed */
  }
  return false;
}

if (!LEGACY_KEY && !ADMIN_KEY) {
  console.warn('[auth] API_KEY/ADMIN_KEY chưa đặt. Endpoint công khai chỉ được bảo vệ khi đã tạo api_keys; SPA cùng origin vẫn qua.');
}

export function createAuth(pool) {
  // requireScope(scope) -> middleware
  function requireScope(scope) {
    return async (req, res, next) => {
      // 1) SPA cùng origin -> cho qua (không cần key).
      if (isSameOriginRequest(req)) return next();

      // 2) Có X-API-Key -> đối chiếu api_keys (hash) rồi tới legacy key.
      const provided = req.headers['x-api-key'];
      if (provided) {
        try {
          const r = await pool.query('SELECT * FROM api_keys WHERE key_hash = $1', [hashKey(provided)]);
          const row = r.rows[0];
          if (row && !row.revoked) {
            const scopes = Array.isArray(row.scopes) ? row.scopes : [];
            if (scopes.includes('admin') || scopes.includes(scope)) {
              pool
                .query('UPDATE api_keys SET last_used_at = $1 WHERE id = $2', [new Date().toISOString(), row.id])
                .catch(() => {});
              req.apiKey = { id: row.id, scopes };
              return next();
            }
            return res.status(403).json({ error: `Forbidden: key thiếu scope "${scope}".` });
          }
        } catch (err) {
          console.error('[auth] key lookup failed', err);
          return res.status(500).json({ error: 'Auth error' });
        }
        if (LEGACY_KEY && provided === LEGACY_KEY) return next();
        return res.status(401).json({ error: 'Unauthorized: X-API-Key không hợp lệ hoặc đã thu hồi.' });
      }

      // 3) Không có key: chỉ cho qua khi CHƯA cấu hình gì (dev pass-through).
      if (await isAnyAuthConfigured()) {
        return res.status(401).json({ error: 'Unauthorized: thiếu header X-API-Key.' });
      }
      return next();
    };
  }

  async function isAnyAuthConfigured() {
    if (LEGACY_KEY) return true;
    try {
      const r = await pool.query('SELECT count(*)::int AS n FROM api_keys WHERE revoked = false');
      return r.rows[0].n > 0;
    } catch {
      return false;
    }
  }

  // Guard cho quản lý key: ADMIN_KEY (header X-Admin-Key) hoặc SPA cùng origin.
  function requireAdmin(req, res, next) {
    if (isSameOriginRequest(req)) return next();
    if (ADMIN_KEY && req.headers['x-admin-key'] === ADMIN_KEY) return next();
    return res.status(401).json({ error: 'Unauthorized: cần X-Admin-Key.' });
  }

  // Router quản lý key tại /api/keys
  const keysRouter = Router();
  keysRouter.use(requireAdmin);

  // POST /api/keys { label, scopes[] } -> trả raw key MỘT LẦN duy nhất
  keysRouter.post('/', async (req, res) => {
    try {
      const { label, scopes } = req.body ?? {};
      const scopeList = Array.isArray(scopes) ? scopes : [];
      const raw = `ft_${crypto.randomBytes(24).toString('hex')}`;
      const id = randomUUID();
      const now = new Date().toISOString();
      await pool.query(
        `INSERT INTO api_keys (id, key_hash, key_prefix, label, scopes, created_at, revoked)
         VALUES ($1,$2,$3,$4,$5,$6,false)`,
        [id, hashKey(raw), raw.slice(0, 12), label ?? '', JSON.stringify(scopeList), now],
      );
      res.status(201).json({ id, key: raw, key_prefix: raw.slice(0, 12), label: label ?? '', scopes: scopeList, note: 'Lưu lại key này — sẽ KHÔNG hiển thị lại.' });
    } catch (err) {
      console.error('[POST /api/keys]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/keys -> chỉ prefix, không bao giờ trả key thô
  keysRouter.get('/', async (_req, res) => {
    try {
      const r = await pool.query(
        'SELECT id, key_prefix, label, scopes, created_at, last_used_at, revoked FROM api_keys ORDER BY created_at DESC',
      );
      res.json({ data: r.rows });
    } catch (err) {
      console.error('[GET /api/keys]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/keys/:id -> thu hồi
  keysRouter.delete('/:id', async (req, res) => {
    try {
      const r = await pool.query('UPDATE api_keys SET revoked = true WHERE id = $1 RETURNING id', [req.params.id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Key không tồn tại' });
      res.json({ data: { id: r.rows[0].id }, message: 'Đã thu hồi key.' });
    } catch (err) {
      console.error('[DELETE /api/keys/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return { requireScope, requireAdmin, keysRouter, isSameOriginRequest };
}
