import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    for (let row of res.rows) {
      const table = row.table_name;
      const c = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'updated_at'`);
      if (c.rows.length === 0) {
        console.log(`${table} is missing updated_at`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
