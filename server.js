import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { pool, ensureSchema } from './db.js';
import { createTasksRouter } from './src/backend/modules/tasks/task.route.js';
import swaggerRouter from './routes/swagger.js';
import { createAuth, createUserAuthRouter } from './src/backend/modules/auth/auth.route.js';
import { authService } from './src/backend/modules/auth/auth.service.js';
import { authenticateUser, requireScope } from './src/backend/modules/auth/auth.middleware.js';
import { webhookService } from './src/backend/modules/webhooks/webhook.service.js';
import { createProjectsRouter } from './src/backend/modules/projects/project.route.js';
import { createFoldersRouter } from './src/backend/modules/folders/folder.route.js';
import { createTagsRouter } from './src/backend/modules/tags/tag.route.js';
import { createChangesRouter } from './routes/changes.js';
import { createHooksRouter, createIntegrationsRouter } from './routes/hooks.js';
import { createEventsRouter, notifyChange } from './routes/events.js';
import stateRouter from './routes/state.js';
import notifyRouter from './routes/notify.js';
import { createWebhookRouter } from './src/backend/modules/webhooks/webhook.route.js';
import { createExternalTaskRouter } from './src/backend/modules/external/external.route.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    // Dung exact match thay vi regex partial de tranh bypass
    const ALLOWED_EXTS = ['.jpeg', '.jpg', '.png', '.gif'];
    const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTS.includes(ext) && ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Chi cho phep upload anh (.png, .jpg, .jpeg, .gif)'));
  }
});

// SSRF Protection: chi cho phep goi den HTTPS public URL, chan IP noi bo
function isSafeWebhookUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  // Chi cho phep https
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  // Chan IP private va loopback
  const BLOCKED = [
    /^localhost$/,
    /^127\./,
    /^0\.0\.0\.0$/,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
    /metadata\.google\.internal/,
  ];
  if (BLOCKED.some((r) => r.test(host))) return false;
  return true;
}

const app = express();

// Security headers (helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      "img-src": ["'self'", "data:", "https://unpkg.com"],
    },
  },
}));

// CORS chi cho phep origin da dinh nghia
const getAllowedOrigins = () => {
  const fromEnv = (process.env.APP_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const devOrigins = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8001',
    'http://127.0.0.1:8001',
    'http://localhost:8002',
    'http://127.0.0.1:8002',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  return [...fromEnv, ...devOrigins];
};

app.use(cors({
  origin: (origin, callback) => {
    // Cho phep request khong co origin (curl, mobile app)
    if (!origin) return callback(null, true);
    if (getAllowedOrigins().includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" khong duoc phep.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Admin-Key'],
}));

// Rate limiting cho auth endpoints (10 request / 15 phut)
// Bo qua rate limit khi co bien test hoac DISABLE_RATE_LIMIT=true
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Qua nhieu yeu cau. Vui long thu lai sau 15 phut.' },
  skip: (req) => req.method === 'OPTIONS' || process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true',
});

// Rate limiting chung (200 request / 1 phut)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Qua nhieu yeu cau. Vui long thu lai sau.' },
  skip: (req) => req.method === 'OPTIONS',
});

// Rate limiting rieng cho external tasks (60 request / 1 phut per API Key)
const externalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Qua nhieu yeu cau den External API. Vui long thu lai sau 1 phut.' },
  keyGenerator: (req) => {
    if (req.apiKey?.id) {
      return `apikey:${req.apiKey.id}`;
    }
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    return req.ip;
  },
  skip: (req) => req.method === 'OPTIONS',
  validate: false,
});

app.use(generalLimiter);

// Webhook raw body parser
app.use('/api/hooks', express.raw({ type: '*/*', limit: '1mb' }));
app.use(express.json({ limit: '10mb' }));

const auth = createAuth(pool);

// SSE nudge on mutations
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) notifyChange();
    });
  }
  next();
});

// Dang ky routes
app.use('/api/auth', createUserAuthRouter(authLimiter));
app.use('/api/state', stateRouter);
app.use('/api/events', createEventsRouter(pool, auth));
app.use('/api/keys', auth.keysRouter);
app.use('/api/tasks', createTasksRouter(pool, auth));
app.use('/api/projects', createProjectsRouter(pool, auth));
app.use('/api/folders', createFoldersRouter(pool, auth));
app.use('/api/tags', createTagsRouter(pool, auth));
app.use('/api/changes', createChangesRouter(pool, auth));
app.use('/api/integrations', createIntegrationsRouter(pool, auth));
app.use('/api/hooks', createHooksRouter(pool));
app.use('/api/webhooks', createWebhookRouter());
app.use('/api/external/v1/tasks', requireScope('tasks'), externalApiLimiter, createExternalTaskRouter());
app.use('/api/docs', swaggerRouter);
app.use('/api/notify', notifyRouter);

// Upload endpoint - yeu cau xac thuc
app.use('/uploads', express.static(uploadDir));
app.post('/api/upload', authenticateUser, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Khong co file nao duoc gui len.' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (err) {
    console.error('[Upload]', err);
    res.status(500).json({ error: 'Loi khi xu ly file upload.' });
  }
});

// Proxy Webhook endpoint - yeu cau xac thuc + SSRF protection
app.post('/api/webhook/test', authenticateUser, async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }
    // Kiem tra SSRF: chi cho phep HTTPS public URL
    if (!isSafeWebhookUrl(webhookUrl)) {
      return res.status(400).json({
        error: 'webhookUrl khong hop le. Chi chap nhan HTTPS URL den cac server public.'
      });
    }
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || { event: 'test', timestamp: new Date().toISOString() }),
    });
    res.status(200).json({
      status: 'success',
      code: response.status,
      message: `${response.status} ${response.statusText}`
    });
  } catch (error) {
    console.error('Webhook proxy error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Khong the ket noi den webhook URL da cung cap.'
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    // Khong tra raw error message ra ngoai
    res.status(503).json({ status: 'error', db: 'connection_failed' });
  }
});

const PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 4000;

async function startWithRetry(maxAttempts = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await ensureSchema();

      // Auto-xoa logs sau 30 ngay (startup & periodic every 24h)
      webhookService.cleanOldLogs().catch((err) => console.error('[cleanup] Initial logs cleanup failed:', err));
      setInterval(() => {
        webhookService.cleanOldLogs().catch((err) => console.error('[cleanup] Periodic logs cleanup failed:', err));
      }, 24 * 60 * 60 * 1000);

      // Auto-revoke expired API keys after 24h (startup & periodic every 24h)
      authService.cleanExpiredApiKeys().catch((err) => console.error('[cleanup] Initial API keys cleanup failed:', err));
      setInterval(() => {
        authService.cleanExpiredApiKeys().catch((err) => console.error('[cleanup] Periodic API keys cleanup failed:', err));
      }, 24 * 60 * 60 * 1000);

      app.listen(PORT, () => {
        console.log(`Focus To Do backend is running on http://localhost:${PORT}`);
      });
      return;
    } catch (error) {
      console.error(`Startup attempt ${attempt}/${maxAttempts} failed:`, error.message);
      if (attempt < maxAttempts) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  console.error('Unable to initialize backend after all retries');
  process.exit(1);
}

const isServerless = !!process.env.VERCEL;
if (isServerless) {
  ensureSchema()
    .then(() => {
      webhookService.cleanOldLogs().catch((err) => console.error('[cleanup] Serverless logs cleanup failed:', err));
      authService.cleanExpiredApiKeys().catch((err) => console.error('[cleanup] Serverless API keys cleanup failed:', err));
    })
    .catch(err => console.error('Failed to init schema:', err));
} else {
  startWithRetry();
}

export default app;
