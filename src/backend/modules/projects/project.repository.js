import { pool } from '../../../../db.js';

export class ProjectRepository {
  async getProjects(userId) {
    const result = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY position ASC, created_at ASC',
      [userId]
    );
    return result.rows;
  }

  async getProjectById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)',
      [id, userId]
    );
    return result.rows[0];
  }

  async checkFolderExists(folderId, userId, client) {
    const q = client || pool;
    const folderCheck = await q.query('SELECT id FROM folders WHERE id = $1 AND user_id = $2', [folderId, userId]);
    return folderCheck.rows.length > 0;
  }

  async getNextPosition(folderId, userId, client) {
    const q = client || pool;
    const posQ = await q.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM projects WHERE folder_id IS NOT DISTINCT FROM $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)',
      [folderId, userId]
    );
    return posQ.rows[0].pos;
  }

  async createProject(project, userId, client) {
    const q = client || pool;
    const r = await q.query(
      `INSERT INTO projects (id, name, color, is_visible, task_count, folder_id, position, created_at, updated_at, user_id)
       VALUES ($1,$2,$3,$4,0,$5,$6,$7,$7,$8) RETURNING *`,
      [project.id, project.name, project.color, project.isVisible, project.folderId, project.position, project.now, userId]
    );
    return r.rows[0];
  }

  async addProjectToFolder(folderId, projectId, now, userId, client) {
    const q = client || pool;
    await q.query(
      `UPDATE folders SET project_ids = (
         SELECT jsonb_agg(DISTINCT e) FROM jsonb_array_elements(COALESCE(project_ids,'[]'::jsonb) || to_jsonb($2::text)) e
       ), updated_at = $3 WHERE id = $1 AND user_id = $4`,
      [folderId, projectId, now, userId]
    );
  }

  async updateProject(id, userId, updated) {
    const r = await pool.query(
      `UPDATE projects SET name=$1, color=$2, is_visible=$3, folder_id=$4, position=$5, updated_at=$6
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [updated.name, updated.color, updated.isVisible, updated.folderId, updated.position, updated.updatedAt, id, userId]
    );
    return r.rows[0];
  }

  async reorderProjects(userId, orderedIds, client) {
    const q = client || pool;
    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i++) {
      await q.query(
        'UPDATE projects SET position = $1, updated_at = $2 WHERE id = $3 AND user_id = $4',
        [i, now, orderedIds[i], userId]
      );
    }
  }

  async deleteProject(id, userId, now, client) {
    const q = client || pool;
    const r = await q.query(
      'UPDATE projects SET is_deleted = true, updated_at = $2 WHERE id = $1 AND user_id = $3 AND (is_deleted = false OR is_deleted IS NULL) RETURNING id',
      [id, now, userId]
    );
    return r.rows[0];
  }

  async removeProjectFromFolders(id, userId, now, client) {
    const q = client || pool;
    await q.query(
      `UPDATE folders SET project_ids = COALESCE(project_ids,'[]'::jsonb) - $1, updated_at = $2
       WHERE project_ids @> to_jsonb($1::text) AND user_id = $3`,
      [id, now, userId]
    );
  }

  async nullifyProjectInTasks(id, userId, now, client) {
    const q = client || pool;
    await q.query(
      'UPDATE tasks SET project_id = NULL, updated_at = $2 WHERE project_id = $1 AND user_id = $3',
      [id, now, userId]
    );
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

export const projectRepository = new ProjectRepository();
