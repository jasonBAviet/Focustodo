import { Router } from 'express';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { hashPassword, pool } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'focustodo_jwt_secret_key_987654321';
const LEGACY_KEY = process.env.API_KEY ?? '';
const ADMIN_KEY = process.env.ADMIN_KEY ?? '';

export function hashKey(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

// Sinh token JWT thu cong bang crypto core Node.js
export function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  // Token co han 30 ngay
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

// Xac thuc token JWT thu cong
export function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && Date.now() / 1000 > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

// Middleware xac thuc nguoi dung cho SPA
export function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: thieu token xac thuc.' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Forbidden: token het han hoac khong hop le.' });
  }
  req.user = decoded; // { id, email }
  next();
}

const DEV_ORIGINS = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function allowedOrigins() {
  const fromEnv = (process.env.APP_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...fromEnv, ...DEV_ORIGINS];
}

function isSameOriginRequest(req) {
  const sfs = req.headers['sec-fetch-site'];
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
    /* ignore */
  }
  return false;
}

export function createAuth(dbPool) {
  // requireScope dung cho client ben ngoai (API Key)
  function requireScope(scope) {
    return async (req, res, next) => {
      // 1) SPA truy cap bang Token JWT
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          req.user = decoded;
          return next();
        }
      }

      // 2) Co X-API-Key -> doi chieu api_keys (luu y luc nay can biet key thuoc user nao)
      const provided = req.headers['x-api-key'];
      if (provided) {
        try {
          const r = await dbPool.query('SELECT * FROM api_keys WHERE key_hash = $1', [hashKey(provided)]);
          const row = r.rows[0];
          if (row && !row.revoked) {
            const scopes = Array.isArray(row.scopes) ? row.scopes : [];
            if (scopes.includes('admin') || scopes.includes(scope)) {
              dbPool
                .query('UPDATE api_keys SET last_used_at = $1 WHERE id = $2', [new Date().toISOString(), row.id])
                .catch(() => {});
              req.apiKey = { id: row.id, scopes };
              // Gan user tuong ung voi API Key vao req.user
              req.user = { id: row.user_id };
              return next();
            }
            return res.status(403).json({ error: `Forbidden: key thieu scope "${scope}".` });
          }
        } catch (err) {
          console.error('[auth] key lookup failed', err);
          return res.status(500).json({ error: 'Auth error' });
        }
        if (LEGACY_KEY && provided === LEGACY_KEY) {
          req.user = { id: 'default_user' };
          return next();
        }
        return res.status(401).json({ error: 'Unauthorized: X-API-Key khong hop le hoac da thu hoi.' });
      }

      return res.status(401).json({ error: 'Unauthorized: thieu Token hoac X-API-Key.' });
    };
  }

  function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }
    if (isSameOriginRequest(req)) return next();
    if (ADMIN_KEY && req.headers['x-admin-key'] === ADMIN_KEY) return next();
    return res.status(401).json({ error: 'Unauthorized: can X-Admin-Key.' });
  }

  const keysRouter = Router();
  keysRouter.use(requireAdmin);

  // POST /api/keys { label, scopes[], userId? }
  keysRouter.post('/', async (req, res) => {
    try {
      const { label, scopes, userId = 'default_user' } = req.body ?? {};
      const scopeList = Array.isArray(scopes) ? scopes : [];
      const raw = `ft_${crypto.randomBytes(24).toString('hex')}`;
      const id = randomUUID();
      const now = new Date().toISOString();
      await dbPool.query(
        `INSERT INTO api_keys (id, key_hash, key_prefix, label, scopes, created_at, revoked, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,false,$7)`,
        [id, hashKey(raw), raw.slice(0, 12), label ?? '', JSON.stringify(scopeList), now, userId],
      );
      res.status(201).json({ id, key: raw, key_prefix: raw.slice(0, 12), label: label ?? '', scopes: scopeList, note: 'Luu lai key nay - se KHONG hien thi lai.' });
    } catch (err) {
      console.error('[POST /api/keys]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  keysRouter.get('/', async (_req, res) => {
    try {
      const r = await dbPool.query(
        'SELECT id, key_prefix, label, scopes, created_at, last_used_at, revoked, user_id FROM api_keys ORDER BY created_at DESC',
      );
      res.json({ data: r.rows });
    } catch (err) {
      console.error('[GET /api/keys]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  keysRouter.delete('/:id', async (req, res) => {
    try {
      const r = await dbPool.query('UPDATE api_keys SET revoked = true WHERE id = $1 RETURNING id', [req.params.id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Key khong ton tai' });
      res.json({ data: { id: r.rows[0].id }, message: 'Da thu hoi key.' });
    } catch (err) {
      console.error('[DELETE /api/keys/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return { requireScope, requireAdmin, keysRouter, isSameOriginRequest };
}

// Router xac thuc nguoi dung cho SPA: Dang ky / Dang nhap
export function createUserAuthRouter() {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email va password la bat buoc.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Mat khau phai co it nhat 6 ky tu.' });
      }

      // Kiem tra email da ton tai chua
      const checkEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Email nay da duoc dang ky.' });
      }

      const userId = randomUUID();
      const hashedPw = hashPassword(password);
      const now = new Date().toISOString();

      await pool.query(
        `INSERT INTO users (id, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, email, hashedPw, now, now]
      );

      // Khi tao user moi, tu dong seed 4 project mac dinh cho user do
      const defaults = [
        ['inbox-' + userId, 'Inbox', '#7ec8e3'],
        ['work-' + userId, 'Work', '#4361ee'],
        ['study-' + userId, 'Study', '#06d6a0'],
        ['personal-' + userId, 'Personal', '#f4a261'],
      ];
      for (const [id, name, color] of defaults) {
        await pool.query(
          `INSERT INTO projects (id, name, color, is_visible, task_count, folder_id, created_at, user_id)
           VALUES ($1,$2,$3,true,0,NULL,$4,$5) ON CONFLICT (id) DO NOTHING`,
          [id, name, color, now, userId],
        );
      }

      const token = generateToken({ id: userId, email });
      res.status(201).json({ token, user: { id: userId, email } });
    } catch (err) {
      console.error('[Auth Register]', err);
      res.status(500).json({ error: 'Loi he thong khi dang ky.' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email va password la bat buoc.' });
      }

      const r = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = r.rows[0];
      if (!user) {
        return res.status(400).json({ error: 'Email hoac mat khau khong dung.' });
      }

      const hashed = hashPassword(password);
      if (user.password_hash !== hashed) {
        return res.status(400).json({ error: 'Email hoac mat khau khong dung.' });
      }

      const token = generateToken({ id: user.id, email: user.email });
      res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
      console.error('[Auth Login]', err);
      res.status(500).json({ error: 'Loi he thong khi dang nhap.' });
    }
  });

  router.get('/me', authenticateUser, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
