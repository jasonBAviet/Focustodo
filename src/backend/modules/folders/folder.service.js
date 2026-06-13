import { randomUUID } from 'crypto';
import { folderRepository } from './folder.repository.js';

export function rowToFolder(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    projectIds: r.project_ids ?? [],
    parentId: r.parent_id ?? null,
    position: r.position ?? 0,
    isVisible: r.is_visible ?? true,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export class FolderService {
  async getFolders(userId) {
    const rows = await folderRepository.getFolders(userId);
    return { data: rows.map(rowToFolder) };
  }

  async getFolderById(id, userId) {
    const row = await folderRepository.getFolderById(id, userId);
    if (!row) throw new Error('Folder khong tim thay');
    return { data: rowToFolder(row) };
  }

  async createFolder(userId, body) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new Error('Truong "name" la bat buoc.');
    }

    const now = new Date().toISOString();
    const id = body.id ?? randomUUID();
    const position = await folderRepository.getNextPosition(userId);

    const folderData = {
      id,
      name: body.name.trim(),
      color: body.color ?? '#7ec8e3',
      projectIds: body.projectIds ?? [],
      parentId: body.parentId ?? null,
      position,
      isVisible: body.isVisible ?? true,
      now
    };

    const row = await folderRepository.createFolder(folderData, userId);
    return { data: rowToFolder(row) };
  }

  async updateFolder(id, userId, body) {
    const cur = await folderRepository.getFolderById(id, userId);
    if (!cur) throw new Error('Folder khong tim thay');

    const nextParent = 'parentId' in body ? body.parentId : cur.parent_id;
    if (nextParent === id) {
      throw new Error('Folder khong the la cha cua chinh no.');
    }

    const updated = {
      name: body.name ?? cur.name,
      color: body.color ?? cur.color,
      projectIds: 'projectIds' in body ? body.projectIds : cur.project_ids,
      parentId: nextParent ?? null,
      position: 'position' in body ? body.position : cur.position,
      isVisible: 'isVisible' in body ? body.isVisible : cur.is_visible,
      updatedAt: new Date().toISOString()
    };

    const row = await folderRepository.updateFolder(id, userId, updated);
    return { data: rowToFolder(row) };
  }

  async reorderFolders(userId, orderedIds) {
    if (!Array.isArray(orderedIds)) {
      throw new Error('orderedIds[] la bat buoc.');
    }
    await folderRepository.runInTransaction(async (client) => {
      await folderRepository.reorderFolders(userId, orderedIds, client);
    });
    return { status: 'ok', count: orderedIds.length };
  }

  async deleteFolder(id, userId) {
    return await folderRepository.runInTransaction(async (client) => {
      const now = new Date().toISOString();
      const row = await folderRepository.deleteFolder(id, userId, now, client);
      if (!row) throw new Error('Folder khong tim thay');

      await folderRepository.nullifyFolderInProjects(id, userId, now, client);
      await folderRepository.nullifyFolderInFolders(id, userId, now, client);

      return { data: { id }, message: 'Da xoa folder.' };
    });
  }
}

export const folderService = new FolderService();
