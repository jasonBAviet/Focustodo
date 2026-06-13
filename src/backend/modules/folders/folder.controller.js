import { folderService } from './folder.service.js';

export class FolderController {
  async getFolders(req, res) {
    try {
      const userId = req.user.id;
      const result = await folderService.getFolders(userId);
      res.json(result);
    } catch (err) {
      console.error('[GET /api/folders]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getFolderById(req, res) {
    try {
      const userId = req.user.id;
      const result = await folderService.getFolderById(req.params.id, userId);
      res.json(result);
    } catch (err) {
      if (err.message === 'Folder khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[GET /api/folders/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createFolder(req, res) {
    try {
      const userId = req.user.id;
      const result = await folderService.createFolder(userId, req.body ?? {});
      res.status(201).json(result);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Folder id da ton tai.' });
      if (err.message.includes('bat buoc')) return res.status(400).json({ error: err.message });
      console.error('[POST /api/folders]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateFolder(req, res) {
    try {
      const userId = req.user.id;
      const result = await folderService.updateFolder(req.params.id, userId, req.body ?? {});
      res.json(result);
    } catch (err) {
      if (err.message === 'Folder khong tim thay') return res.status(404).json({ error: err.message });
      if (err.message === 'Folder khong the la cha cua chinh no.') return res.status(400).json({ error: err.message });
      console.error('[PUT /api/folders/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async reorderFolders(req, res) {
    try {
      const userId = req.user.id;
      const { orderedIds } = req.body ?? {};
      const result = await folderService.reorderFolders(userId, orderedIds);
      res.json(result);
    } catch (err) {
      if (err.message.includes('bat buoc')) return res.status(400).json({ error: err.message });
      console.error('[POST /api/folders/reorder]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteFolder(req, res) {
    try {
      const userId = req.user.id;
      const result = await folderService.deleteFolder(req.params.id, userId);
      res.json(result);
    } catch (err) {
      if (err.message === 'Folder khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[DELETE /api/folders/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const folderController = new FolderController();
