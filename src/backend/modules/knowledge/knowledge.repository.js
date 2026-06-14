import { pool } from '../../../../db.js';
import { randomUUID } from 'crypto';

export class KnowledgeRepository {
  async getKnowledges(userId, filters) {
    const conditions = ['user_id = $1', '(is_deleted = false OR is_deleted IS NULL)'];
    const params = [userId];

    if (filters.projectId) {
      params.push(filters.projectId);
      conditions.push(`project_id = $${params.length}`);
    }
    if (filters.priority) {
      params.push(filters.priority);
      conditions.push(`priority = $${params.length}`);
    }
    if (filters.completed !== undefined) {
      params.push(filters.completed);
      conditions.push(`completed = $${params.length}`);
    }
    if (filters.dueDate) {
      params.push(filters.dueDate);
      conditions.push(`due_date = $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const limitVal = filters.limit;
    const offsetVal = filters.offset;

    // Duplications params for total count
    const countParams = [...params];

    params.push(limitVal);
    const limitParamIdx = params.length;
    params.push(offsetVal);
    const offsetParamIdx = params.length;

    const queryStr = `SELECT * FROM knowleadge ${where} ORDER BY position ASC, created_at DESC LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`;
    const result = await pool.query(queryStr, params);

    const countResult = await pool.query(`SELECT count(*)::int AS total FROM knowleadge ${where}`, countParams);

    return {
      rows: result.rows,
      total: countResult.rows[0].total,
      limit: limitVal,
      offset: offsetVal
    };
  }

  async getKnowledgeById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM knowleadge WHERE id = $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)',
      [id, userId]
    );
    return result.rows[0];
  }

  async getProjectById(projectId, userId) {
    const proj = await pool.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
    return proj.rows[0];
  }

  async getNextKnowledgePosition(projectId, userId) {
    const r = await pool.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM knowleadge
       WHERE project_id IS NOT DISTINCT FROM $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)`,
      [projectId ?? null, userId]
    );
    return r.rows[0].pos;
  }

  async insertKnowledge(input, userId) {
    const now = new Date().toISOString();
    const projectId = input.projectId ?? null;
    const position = input.position ?? (await this.getNextKnowledgePosition(projectId, userId));
    const id = input.id ?? randomUUID();

    const result = await pool.query(
      `INSERT INTO knowleadge
         (id, title, project_id, priority, due_date, reminder, repeat, repeat_custom,
          note, subtasks, pomodoro_estimate, pomodoro_completed, total_focus_time,
          completed, flagged, tags, position, created_at, completed_at, updated_at, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [
        id, String(input.title ?? '').trim(), projectId, input.priority ?? 'none',
        input.dueDate ?? null, input.reminder ?? null, input.repeat ?? 'none', input.repeatCustom ?? null,
        input.note ?? '', JSON.stringify(input.subtasks ?? []), input.pomodoroEstimate ?? 1,
        0, 0, false, input.flagged ?? false, JSON.stringify(input.tags ?? []),
        position, now, null, now, userId
      ]
    );
    return result.rows[0];
  }

  async updateKnowledgeCompleteStatus(id, userId, completed, completedAt, now) {
    const result = await pool.query(
      'UPDATE knowleadge SET completed = $1, completed_at = $2, updated_at = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [completed, completedAt, now, id, userId]
    );
    return result.rows[0];
  }

  async updateKnowledge(id, userId, updated) {
    const result = await pool.query(
      `UPDATE knowleadge SET
        title=$1, project_id=$2, priority=$3, due_date=$4, reminder=$5,
        repeat=$6, repeat_custom=$7, note=$8, subtasks=$9, pomodoro_estimate=$10,
        completed=$11, flagged=$12, tags=$13, position=$14, completed_at=$15, updated_at=$16
       WHERE id=$17 AND user_id=$18 RETURNING *`,
      [
        updated.title, updated.project_id, updated.priority, updated.due_date,
        updated.reminder, updated.repeat, updated.repeat_custom, updated.note,
        updated.subtasks, updated.pomodoro_estimate, updated.completed,
        updated.flagged, updated.tags, updated.position, updated.completed_at, updated.updated_at,
        id, userId
      ]
    );
    return result.rows[0];
  }

  async deleteKnowledge(id, userId, now) {
    const result = await pool.query(
      'UPDATE knowleadge SET is_deleted = true, updated_at = $2 WHERE id = $1 AND user_id = $3 AND (is_deleted = false OR is_deleted IS NULL) RETURNING *',
      [id, now, userId]
    );
    return result.rows[0];
  }



  async reorderKnowledges(userId, orderedIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE knowleadge SET position = $1, updated_at = $2 WHERE id = $3 AND user_id = $4',
          [i, now, orderedIds[i], userId]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async runInTransaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}

export const knowledgeRepository = new KnowledgeRepository();
