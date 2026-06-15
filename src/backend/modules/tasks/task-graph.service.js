/**
 * Task Graph Service
 * Phân tích cấu trúc thư mục, dự án, công việc và việc nhỏ để tạo đồ thị D3.
 */

import { pool } from '../../../../db.js';
import { folderRepository } from '../folders/folder.repository.js';
import { projectRepository } from '../projects/project.repository.js';
import { taskRepository } from './task.repository.js';
import { tagRepository } from '../tags/tag.repository.js';

/**
 * Lấy dữ liệu đồ thị tri thức nhiệm vụ cho user theo bộ lọc
 * @param {string} userId
 * @param {object} filters
 * @returns {Promise<{nodes: Array, links: Array}>}
 */
export async function getTaskKGData(userId, filters = {}) {
  // 1. Lấy danh sách nhiệm vụ khớp bộ lọc (giới hạn tối đa 1000 nhiệm vụ)
  const taskFilters = { ...filters, limit: 1000, offset: 0 };
  const tasksRes = await taskRepository.getTasks(userId, taskFilters);
  const tasks = tasksRes.rows;

  // 2. Xác định các dự án liên quan để tải
  const projectIds = new Set();
  if (filters.projectId) {
    projectIds.add(filters.projectId);
  }
  tasks.forEach(t => {
    if (t.project_id) projectIds.add(t.project_id);
  });

  let projects = [];
  if (projectIds.size > 0) {
    const projRes = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 AND id = ANY($2) AND (is_deleted = false OR is_deleted IS NULL)',
      [userId, Array.from(projectIds)]
    );
    projects = projRes.rows;
  } else if (!filters.projectId && !filters.folderId) {
    // Nếu không có bộ lọc cụ thể, lấy tất cả dự án hoạt động của user
    projects = await projectRepository.getProjects(userId);
  }

  // 3. Xác định các thư mục liên quan để tải
  const folderIds = new Set();
  if (filters.folderId) {
    folderIds.add(filters.folderId);
  }
  projects.forEach(p => {
    if (p.folder_id) folderIds.add(p.folder_id);
  });

  let folders = [];
  if (folderIds.size > 0) {
    // Recursive CTE: fetch only the needed folders and their ancestors in one query
    // instead of loading the entire folders table and filtering in JS.
    const foldersRes = await pool.query(
      `WITH RECURSIVE ancestors AS (
         SELECT * FROM folders
         WHERE id = ANY($2) AND user_id = $1 AND (is_deleted = false OR is_deleted IS NULL)
         UNION ALL
         SELECT f.* FROM folders f
         JOIN ancestors a ON f.id = a.parent_id
         WHERE f.user_id = $1 AND (f.is_deleted = false OR f.is_deleted IS NULL)
       )
       SELECT DISTINCT * FROM ancestors`,
      [userId, Array.from(folderIds)]
    );
    folders = foldersRes.rows;
  } else if (!filters.projectId && !filters.folderId) {
    // Lấy toàn bộ thư mục hoạt động
    folders = await folderRepository.getFolders(userId);
  }

  // 3b. Tải danh sách nhãn (tags) của user
  const allTags = await tagRepository.getTags(userId);
  const tagMap = new Map(allTags.map(t => [t.id, t]));
  const usedTags = new Map();

  const nodes = [];
  const links = [];

  // Tạo các Folder nodes
  for (const f of folders) {
    nodes.push({
      id: f.id,
      type: 'folder',
      title: f.name,
      parentId: f.parent_id || null,
      childrenCount: 0
    });
  }

  // Tạo các Project nodes
  for (const p of projects) {
    nodes.push({
      id: p.id,
      type: 'project',
      title: p.name,
      parentId: p.folder_id || null,
      childrenCount: 0
    });
  }

  // Tạo các Task & Subtask nodes
  for (const t of tasks) {
    const subtasks = t.subtasks || [];
    
    // Tìm các tag hợp lệ của task
    let rawTags = t.tags;
    if (typeof rawTags === 'string') {
      try {
        rawTags = JSON.parse(rawTags);
      } catch (e) {
        rawTags = [];
      }
    }
    const taskTags = (Array.isArray(rawTags) ? rawTags : [])
      .map(tagId => tagMap.get(tagId))
      .filter(Boolean);

    let taskParentId = t.project_id || null;

    if (taskTags.length > 0) {
      // Nếu task có tag, gán parent chính của task là tag đầu tiên
      taskParentId = 'tag-' + taskTags[0].id;
      
      // Đánh dấu các tag này là được sử dụng trong đồ thị
      taskTags.forEach(tag => usedTags.set(tag.id, tag));

      // Đối với các tag còn lại, tạo liên kết trực tiếp từ tag đến task
      for (let i = 1; i < taskTags.length; i++) {
        links.push({
          source: 'tag-' + taskTags[i].id,
          target: t.id,
          relationType: 'parent-child'
        });
      }
    }

    nodes.push({
      id: t.id,
      type: 'task',
      title: t.title,
      parentId: taskParentId,
      isCompleted: t.completed,
      childrenCount: subtasks.length
    });

    for (const st of subtasks) {
      nodes.push({
        id: st.id,
        type: 'subtask',
        title: st.title,
        parentId: t.id,
        isCompleted: st.completed,
        childrenCount: 0
      });
    }
  }

  // Tạo các Tag nodes được sử dụng thực tế
  for (const tag of usedTags.values()) {
    nodes.push({
      id: 'tag-' + tag.id,
      type: 'tag',
      title: tag.name,
      parentId: tag.project_id || tag.folder_id || null,
      childrenCount: 0,
      meta: { color: tag.color }
    });
  }

  // Liên kết các nodes và tính childrenCount
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  for (const n of nodes) {
    if (n.parentId) {
      const parent = nodeMap.get(n.parentId);
      if (parent) {
        parent.childrenCount = (parent.childrenCount || 0) + 1;
        links.push({
          source: n.parentId,
          target: n.id,
          relationType: 'parent-child'
        });
      }
    }
  }

  // Lọc loại bỏ các liên kết bị đứt gãy để đảm bảo an toàn cho simulation D3
  const nodeIds = new Set(nodes.map(n => n.id));
  const validLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

  return { nodes, links: validLinks };
}
