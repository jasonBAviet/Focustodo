import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pkg;
const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
} = process.env;

if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
  console.error('Missing required DB environment variables in .env');
  process.exit(1);
}

const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 10,
});

const app = express();
app.use(cors());
app.use(express.json());

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: 'Database unavailable' });
  }
});

app.get('/api/state', async (req, res) => {
  try {
    const result = await pool.query('SELECT state FROM app_state WHERE id = $1', ['default']);
    if (result.rowCount === 0) {
      return res.json({ state: null });
    }
    res.json({ state: result.rows[0].state });
  } catch (error) {
    console.error('Failed to load remote state:', error);
    res.status(500).json({ error: 'Failed to load remote state' });
  }
});

app.post('/api/state', async (req, res) => {
  try {
    const incomingState = req.body.state ?? req.body;
    await pool.query(
      `INSERT INTO app_state (id, state, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at`,
      ['default', incomingState],
    );
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to save remote state:', error);
    res.status(500).json({ error: 'Failed to save remote state' });
  }
});

const PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 4000;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Focus To Do backend is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Unable to initialize backend:', error);
    process.exit(1);
  });
