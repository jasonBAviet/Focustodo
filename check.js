import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.query('SELECT state FROM app_state WHERE id = $1', ['default'])
  .then(res => {
    if (res.rowCount === 0) {
      console.log('No state in DB');
    } else {
      const tasks = res.rows[0].state.tasks || [];
      console.log('Total tasks in DB:', tasks.length);
      const sample = tasks.find(t => t.title.includes('n8n'));
      if (sample) console.log('Found sample task:', sample.title);
      else console.log('Sample task not found in DB.');
    }
    pool.end();
  })
  .catch(err => { console.error('Error:', err); pool.end(); });
