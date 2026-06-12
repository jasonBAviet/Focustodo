import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { pool, ensureSchema } from './db.js';
import { createTasksRouter } from './routes/tasks.js';
import swaggerRouter from './routes/swagger.js';
import { createAuth, createUserAuthRouter } from './routes/auth.js';
import { createProjectsRouter } from './routes/projects.js';
import { createFoldersRouter } from './routes/folders.js';
import { createTagsRouter } from './routes/tags.js';
import { createChangesRouter } from './routes/changes.js';
import { createHooksRouter, createIntegrationsRouter } from './routes/hooks.js';
import { createEventsRouter, notifyChange } from './routes/events.js';
import stateRouter from './routes/state.js';

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
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Chi cho phep upload anh (.png, .jpg, .jpeg, .gif)'));
  }
});

const app = express();
app.use(cors());

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
app.use('/api/auth', createUserAuthRouter());
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
app.use('/api/docs', swaggerRouter);

// Upload endpoint
app.use('/uploads', express.static(uploadDir));
app.post('/api/upload', upload.single('file'), (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// Proxy Webhook endpoint
app.post('/api/webhook/test', async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
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
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'connection_failed', message: err.message });
  }
});

const PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 4000;

async function startWithRetry(maxAttempts = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await ensureSchema();
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
  ensureSchema().catch(err => console.error('Failed to init schema:', err));
} else {
  startWithRetry();
}

export default app;
