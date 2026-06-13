import { randomUUID } from 'crypto';
import { projectRepository } from './project.repository.js';

export function rowToProject(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    isVisible: r.is_visible ?? true,
    taskCount: r.task_count ?? 0,
    folderId: r.folder_id ?? null,
    position: r.position ?? 0,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export class ProjectService {
  async getProjects(userId) {
    const rows = await projectRepository.getProjects(userId);
    return { data: rows.map(rowToProject) };
  }

  async getProjectById(id, userId) {
    const row = await projectRepository.getProjectById(id, userId);
    if (!row) throw new Error('Project khong tim thay');
    return { data: rowToProject(row) };
  }

  async createProject(userId, body) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new Error('Truong "name" la bat buoc.');
    }

    return await projectRepository.runInTransaction(async (client) => {
      const now = new Date().toISOString();
      const id = body.id ?? randomUUID();
      const folderId = body.folderId ?? null;

      if (folderId) {
        const exists = await projectRepository.checkFolderExists(folderId, userId, client);
        if (!exists) {
          throw new Error(`Folder "${folderId}" khong ton tai hoac khong thuoc quyen so huu.`);
        }
      }

      const position = await projectRepository.getNextPosition(folderId, userId, client);

      const projectData = {
        id,
        name: body.name.trim(),
        color: body.color ?? '#7ec8e3',
        isVisible: body.isVisible ?? true,
        folderId,
        position,
        now
      };

      const row = await projectRepository.createProject(projectData, userId, client);

      if (folderId) {
        await projectRepository.addProjectToFolder(folderId, id, now, userId, client);
      }

      return { data: rowToProject(row) };
    });
  }

  async updateProject(id, userId, body) {
    const cur = await projectRepository.getProjectById(id, userId);
    if (!cur) throw new Error('Project khong tim thay');

    const updated = {
      name: body.name ?? cur.name,
      color: body.color ?? cur.color,
      isVisible: 'isVisible' in body ? body.isVisible : cur.is_visible,
      folderId: 'folderId' in body ? body.folderId : cur.folder_id,
      position: 'position' in body ? body.position : cur.position,
      updatedAt: new Date().toISOString()
    };

    const row = await projectRepository.updateProject(id, userId, updated);
    return { data: rowToProject(row) };
  }

  async reorderProjects(userId, orderedIds) {
    if (!Array.isArray(orderedIds)) {
      throw new Error('orderedIds[] la bat buoc.');
    }
    await projectRepository.runInTransaction(async (client) => {
      await projectRepository.reorderProjects(userId, orderedIds, client);
    });
    return { status: 'ok', count: orderedIds.length };
  }

  async deleteProject(id, userId) {
    return await projectRepository.runInTransaction(async (client) => {
      const now = new Date().toISOString();
      const row = await projectRepository.deleteProject(id, userId, now, client);
      if (!row) throw new Error('Project khong tim thay');

      await projectRepository.removeProjectFromFolders(id, userId, now, client);
      await projectRepository.nullifyProjectInTasks(id, userId, now, client);

      return { data: { id }, message: 'Da xoa project.' };
    });
  }
}

export const projectService = new ProjectService();
