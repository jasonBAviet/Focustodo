import { tagService } from './tag.service.js';

export class TagController {
  async getTags(req, res) {
    try {
      const userId = req.user.id;
      const result = await tagService.getTags(userId);
      res.json(result);
    } catch (err) {
      console.error('[GET /api/tags]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTagById(req, res) {
    try {
      const userId = req.user.id;
      const result = await tagService.getTagById(req.params.id, userId);
      res.json(result);
    } catch (err) {
      if (err.message === 'Tag khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[GET /api/tags/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createTag(req, res) {
    try {
      const userId = req.user.id;
      const result = await tagService.createTag(userId, req.body ?? {});
      res.status(201).json(result);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Tag id da ton tai.' });
      if (err.message.includes('bat buoc')) return res.status(400).json({ error: err.message });
      console.error('[POST /api/tags]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateTag(req, res) {
    try {
      const userId = req.user.id;
      const result = await tagService.updateTag(req.params.id, userId, req.body ?? {});
      res.json(result);
    } catch (err) {
      if (err.message === 'Tag khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[PUT /api/tags/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteTag(req, res) {
    try {
      const userId = req.user.id;
      const result = await tagService.deleteTag(req.params.id, userId);
      res.json(result);
    } catch (err) {
      if (err.message === 'Tag khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[DELETE /api/tags/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const tagController = new TagController();
