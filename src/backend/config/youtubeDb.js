import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const { Pool } = pkg;
const {
  YOUTUBE_DB_HOST,
  YOUTUBE_DB_PORT,
  YOUTUBE_DB_NAME,
  YOUTUBE_DB_USER,
  YOUTUBE_DB_PASSWORD,
} = process.env;

export const youtubePool = new Pool({
  host: YOUTUBE_DB_HOST || 'localhost',
  port: Number(YOUTUBE_DB_PORT) || 5432,
  database: YOUTUBE_DB_NAME || 'youtube_subtitle',
  user: YOUTUBE_DB_USER || 'postgres',
  password: YOUTUBE_DB_PASSWORD || 'postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

youtubePool.on('error', (err) => {
  console.error('Unexpected error on idle youtube database client:', err.message);
});
