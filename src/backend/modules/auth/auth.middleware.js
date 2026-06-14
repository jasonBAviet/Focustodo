import { authService } from './auth.service.js';

const LEGACY_KEY = process.env.API_KEY ?? '';
const ADMIN_KEY = process.env.ADMIN_KEY ?? '';

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

export function isSameOriginRequest(req) {
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

export function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: thieu token xac thuc.' });
  }
  const decoded = authService.verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Forbidden: token het han hoac khong hop le.' });
  }
  req.user = decoded; // { id, email }
  next();
}

export function requireScope(scope) {
  return async (req, res, next) => {
    // 1) SPA truy cap bang Token JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const decoded = authService.verifyToken(token);
      if (decoded) {
        req.user = decoded;
        return next();
      }
    }

    // 2) Co X-API-Key -> doi chieu api_keys
    const provided = req.headers['x-api-key'];
    if (provided) {
      // LEGACY_KEY check first — plaintext master key, no scope enforcement
      if (LEGACY_KEY && provided === LEGACY_KEY) {
        req.user = { id: 'default_user' };
        return next();
      }

      try {
        const validation = await authService.validateApiKey(provided, scope);
        if (validation.valid) {
          req.apiKey = validation.apiKey;
          req.user = validation.user;
          return next();
        } else if (validation.error) {
          return res.status(403).json({ error: validation.error });
        }
      } catch (err) {
        console.error('[auth] key lookup failed', err);
        return res.status(500).json({ error: 'Auth error' });
      }

      return res.status(401).json({ error: 'Unauthorized: X-API-Key khong hop le hoac da thu hoi.' });
    }

    return res.status(401).json({ error: 'Unauthorized: thieu Token hoac X-API-Key.' });
  };
}

export function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  if (isSameOriginRequest(req)) return next();
  if (ADMIN_KEY && req.headers['x-admin-key'] === ADMIN_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized: can X-Admin-Key.' });
}
