import { projectService } from './project.service.js';

export class ProjectController {
  async getProjects(req, res) {
    try {
      const userId = req.user.id;
      const result = await projectService.getProjects(userId);
      res.json(result);
    } catch (err) {
      console.error('[GET /api/projects]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProjectById(req, res) {
    try {
      const userId = req.user.id;
      const result = await projectService.getProjectById(req.params.id, userId);
      res.json(result);
    } catch (err) {
      if (err.message === 'Project khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[GET /api/projects/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createProject(req, res) {
    try {
      const userId = req.user.id;
      const result = await projectService.createProject(userId, req.body ?? {});
      res.status(201).json(result);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Project id da ton tai.' });
      if (err.message.includes('bat buoc') || err.message.includes('khong ton tai')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('[POST /api/projects]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProject(req, res) {
    try {
      const userId = req.user.id;
      const result = await projectService.updateProject(req.params.id, userId, req.body ?? {});
      res.json(result);
    } catch (err) {
      if (err.message === 'Project khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[PUT /api/projects/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async reorderProjects(req, res) {
    try {
      const userId = req.user.id;
      const { orderedIds } = req.body ?? {};
      const result = await projectService.reorderProjects(userId, orderedIds);
      res.json(result);
    } catch (err) {
      if (err.message.includes('bat buoc')) return res.status(400).json({ error: err.message });
      console.error('[POST /api/projects/reorder]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProject(req, res) {
    try {
      const userId = req.user.id;
      const result = await projectService.deleteProject(req.params.id, userId);
      res.json(result);
    } catch (err) {
      if (err.message === 'Project khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[DELETE /api/projects/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const projectController = new ProjectController();
