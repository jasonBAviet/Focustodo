import { Router } from 'express';
import { taskService } from '../tasks/task.service.js';
import { knowledgeService } from '../knowledge/knowledge.service.js';

export function createExternalTaskRouter() {
  const router = Router();

  // GET /api/external/v1/tasks
  router.get('/', async (req, res) => {
    try {
      const filters = {
        projectId: req.query.projectId || null,
        priority: req.query.priority || null,
        limit: Math.min(parseInt(req.query.limit) || 50, 200),
        offset: parseInt(req.query.offset) || 0,
      };
      if (req.query.completed !== undefined) filters.completed = req.query.completed === 'true';
      let result;
      if (req.query.isKnowledge === 'true') {
        result = await knowledgeService.getKnowledges(req.user.id, filters);
      } else {
        result = await taskService.getTasks(req.user.id, filters);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/external/v1/tasks
  router.post('/', async (req, res) => {
    try {
      let result;
      if (req.body?.isKnowledge) {
        result = await knowledgeService.createKnowledge(req.user.id, req.body);
      } else {
        result = await taskService.createTask(req.user.id, req.body ?? {});
      }
      res.status(201).json(result);
    } catch (err) {
      const clientErr = err.message.includes('bat buoc') || err.message.includes('phai la') || err.message.includes('khong ton tai');
      res.status(clientErr ? 400 : 500).json({ error: err.message });
    }
  });

  // PUT /api/external/v1/tasks/:id
  router.put('/:id', async (req, res) => {
    try {
      let result;
      if (req.body?.isKnowledge || req.query.isKnowledge === 'true') {
        result = await knowledgeService.updateKnowledge(req.params.id, req.user.id, req.body ?? {});
      } else {
        result = await taskService.updateTask(req.params.id, req.user.id, req.body ?? {});
      }
      res.json(result);
    } catch (err) {
      if (err.message.includes('khong tim thay')) return res.status(404).json({ error: err.message });
      const clientErr = err.message.includes('phai la');
      res.status(clientErr ? 400 : 500).json({ error: err.message });
    }
  });

  // DELETE /api/external/v1/tasks/:id
  router.delete('/:id', async (req, res) => {
    try {
      let result;
      if (req.query.isKnowledge === 'true') {
        result = await knowledgeService.deleteKnowledge(req.params.id, req.user.id);
      } else {
        result = await taskService.deleteTask(req.params.id, req.user.id);
      }
      res.json(result);
    } catch (err) {
      if (err.message.includes('khong tim thay')) return res.status(404).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
