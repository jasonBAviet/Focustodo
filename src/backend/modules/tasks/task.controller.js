import { taskService } from './task.service.js';
import { getTaskKGData } from './task-graph.service.js';

export class TaskController {
  async getTaskKG(req, res) {
    try {
      const userId = req.user.id;
      const { projectId, priority, completed, dueDate } = req.query;

      const filters = {
        projectId,
        priority,
        completed: completed !== undefined ? completed === 'true' : undefined,
        dueDate,
      };

      const result = await getTaskKGData(userId, filters);
      res.json(result);
    } catch (err) {
      console.error('[GET /api/tasks/kg]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTasks(req, res) {
    try {
      const userId = req.user.id;
      const { projectId, priority, completed, dueDate, limit = 100, offset = 0 } = req.query;
      
      const filters = {
        projectId,
        priority,
        completed: completed !== undefined ? completed === 'true' : undefined,
        dueDate,
        limit: Math.min(Number(limit) || 100, 500),
        offset: Number(offset) || 0
      };

      const result = await taskService.getTasks(userId, filters);
      res.json(result);
    } catch (err) {
      if (err.message.includes('priority phai la mot trong')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('[GET /api/tasks]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTaskById(req, res) {
    try {
      const userId = req.user.id;
      const result = await taskService.getTaskById(req.params.id, userId);
      res.json(result);
    } catch (err) {
      if (err.message === 'Task khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[GET /api/tasks/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createTask(req, res) {
    try {
      const userId = req.user.id;
      const result = await taskService.createTask(userId, req.body ?? {});
      res.status(201).json(result);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: `Task voi id "${req.body.id}" da ton tai.` });
      }
      if (err.message.includes('bat buoc') || err.message.includes('phai la mot trong') || err.message.includes('khong ton tai')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('[POST /api/tasks]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async completeTask(req, res) {
    try {
      const userId = req.user.id;
      const completed = req.body?.completed !== false;
      const result = await taskService.completeTask(req.params.id, userId, completed);
      res.json(result);
    } catch (err) {
      if (err.message === 'Task khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[PATCH /api/tasks/:id/complete]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateTask(req, res) {
    try {
      const userId = req.user.id;
      const result = await taskService.updateTask(req.params.id, userId, req.body ?? {});
      res.json(result);
    } catch (err) {
      if (err.message === 'Task khong tim thay') return res.status(404).json({ error: err.message });
      if (err.message.includes('phai la mot trong')) return res.status(400).json({ error: err.message });
      console.error('[PUT /api/tasks/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async reorderTasks(req, res) {
    try {
      const userId = req.user.id;
      const { orderedIds } = req.body ?? {};
      const result = await taskService.reorderTasks(userId, orderedIds);
      res.json(result);
    } catch (err) {
      if (err.message.includes('bat buoc')) return res.status(400).json({ error: err.message });
      console.error('[POST /api/tasks/reorder]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteTask(req, res) {
    try {
      const userId = req.user.id;
      const result = await taskService.deleteTask(req.params.id, userId);
      res.json(result);
    } catch (err) {
      if (err.message === 'Task khong tim thay') return res.status(404).json({ error: err.message });
      console.error('[DELETE /api/tasks/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const taskController = new TaskController();
