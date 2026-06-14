import { pool } from '../../../../db.js';

export class WebhookRepository {
  async getSubscribers(userId) {
    const result = await pool.query(
      'SELECT * FROM webhook_subscribers WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    return result.rows;
  }

  async insertSubscriber({ id, userId, name, url, events, secret }) {
    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO webhook_subscribers (id, user_id, name, url, events, enabled, secret, created_at)
       VALUES ($1, $2, $3, $4, $5, true, $6, $7)
       RETURNING *`,
      [id, userId, name, url, events, secret || null, now]
    );
    return result.rows[0];
  }

  async updateSubscriber(id, userId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;
    if ('enabled' in updates) { fields.push(`enabled = $${idx++}`); values.push(updates.enabled); }
    if ('name' in updates) { fields.push(`name = $${idx++}`); values.push(updates.name); }
    if ('url' in updates) { fields.push(`url = $${idx++}`); values.push(updates.url); }
    if ('events' in updates) { fields.push(`events = $${idx++}`); values.push(updates.events); }
    if (!fields.length) return null;
    values.push(id, userId);
    const result = await pool.query(
      `UPDATE webhook_subscribers SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteSubscriber(id, userId) {
    const result = await pool.query(
      'DELETE FROM webhook_subscribers WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  async updateLastTriggered(id, timestamp) {
    await pool.query(
      'UPDATE webhook_subscribers SET last_triggered_at = $1 WHERE id = $2',
      [timestamp, id]
    );
  }

  async insertDeliveryLog({ id, userId, subscriberId, event, httpStatus, error, timestamp }) {
    const result = await pool.query(
      `INSERT INTO webhook_delivery_logs (id, user_id, subscriber_id, event, http_status, error, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId || null, subscriberId || null, event, httpStatus || null, error || null, timestamp]
    );
    return result.rows[0];
  }

  async deleteLogsOlderThan(timestamp) {
    const result = await pool.query(
      'DELETE FROM webhook_delivery_logs WHERE timestamp < $1',
      [timestamp]
    );
    return result.rowCount;
  }
}

export const webhookRepository = new WebhookRepository();
