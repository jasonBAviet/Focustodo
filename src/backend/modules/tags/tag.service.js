import { randomUUID } from 'crypto';
import { tagRepository } from './tag.repository.js';

export function rowToTag(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    projectId: r.project_id ?? null,
    folderId: r.folder_id ?? null,
    isVisible: r.is_visible ?? true,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export class TagService {
  async getTags(userId) {
    const rows = await tagRepository.getTags(userId);
    return { data: rows.map(rowToTag) };
  }

  async getTagById(id, userId) {
    const row = await tagRepository.getTagById(id, userId);
    if (!row) throw new Error('Tag khong tim thay');
    return { data: rowToTag(row) };
  }

  async createTag(userId, body) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new Error('Truong "name" la bat buoc.');
    }

    const now = new Date().toISOString();
    const id = body.id ?? randomUUID();

    const tagData = {
      id,
      name: body.name.trim(),
      color: body.color ?? '#7ec8e3',
      projectId: body.projectId ?? null,
      folderId: body.folderId ?? null,
      isVisible: body.isVisible ?? true,
      now
    };

    const row = await tagRepository.createTag(tagData, userId);
    return { data: rowToTag(row) };
  }

  async updateTag(id, userId, body) {
    const cur = await tagRepository.getTagById(id, userId);
    if (!cur) throw new Error('Tag khong tim thay');

    const updated = {
      name: body.name ?? cur.name,
      color: body.color ?? cur.color,
      projectId: 'projectId' in body ? body.projectId : cur.project_id,
      folderId: 'folderId' in body ? body.folderId : cur.folder_id,
      isVisible: 'isVisible' in body ? body.isVisible : cur.is_visible,
      updatedAt: new Date().toISOString()
    };

    const row = await tagRepository.updateTag(id, userId, updated);
    return { data: rowToTag(row) };
  }

  async deleteTag(id, userId) {
    return await tagRepository.runInTransaction(async (client) => {
      const now = new Date().toISOString();
      const row = await tagRepository.deleteTag(id, userId, now, client);
      if (!row) throw new Error('Tag khong tim thay');

      await tagRepository.removeTagFromTasks(id, userId, now, client);

      return { data: { id }, message: 'Da xoa tag.' };
    });
  }
}

export const tagService = new TagService();
