import { pool } from '../../../../db.js';

export class AuthRepository {
  async findKeyByHash(keyHash) {
    const result = await pool.query('SELECT * FROM api_keys WHERE key_hash = $1', [keyHash]);
    return result.rows[0];
  }

  async updateKeyLastUsed(id, lastUsedAt) {
    await pool.query('UPDATE api_keys SET last_used_at = $1 WHERE id = $2', [lastUsedAt, id]);
  }

  async insertApiKey({ id, keyHash, keyPrefix, label, scopes, createdAt, userId }) {
    await pool.query(
      `INSERT INTO api_keys (id, key_hash, key_prefix, label, scopes, created_at, revoked, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
      [id, keyHash, keyPrefix, label, JSON.stringify(scopes), createdAt, userId]
    );
  }

  async getAllApiKeys() {
    const result = await pool.query(
      'SELECT id, key_prefix, label, scopes, created_at, last_used_at, revoked, user_id FROM api_keys ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async revokeApiKey(id) {
    const result = await pool.query('UPDATE api_keys SET revoked = true WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  }

  async getApiKeysByUser(userId) {
    const result = await pool.query(
      'SELECT id, key_prefix, label, scopes, created_at, last_used_at, revoked FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async revokeApiKeyByUser(id, userId) {
    const result = await pool.query(
      'UPDATE api_keys SET revoked = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rows[0];
  }

  async revokeExpiredApiKeys() {
    const result = await pool.query(
      `UPDATE api_keys 
       SET revoked = true 
       WHERE revoked = false 
         AND created_at IS NOT NULL 
         AND created_at::timestamptz < NOW() - INTERVAL '24 hours'
       RETURNING id`
    );
    return result.rows.map(row => row.id);
  }

  async findUserByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  async insertUser({ userId, email, hashedPw, salt, now }) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email, hashedPw, salt, now, now]
    );
  }

  async updateUserSalt(userId, newHash, newSalt, now) {
    await pool.query(
      'UPDATE users SET password_hash = $1, password_salt = $2, updated_at = $3 WHERE id = $4',
      [newHash, newSalt, now, userId]
    );
  }

  async seedDefaultProjects(userId, now) {
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
        [id, name, color, now, userId]
      );
    }
  }
}

export const authRepository = new AuthRepository();
