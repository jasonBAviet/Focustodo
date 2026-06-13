import { Router } from 'express';
import { projectController } from './project.controller.js';

export function createProjectsRouter(pool, auth) {
  const router = Router();
  const requireRead = auth.requireScope('projects:read');
  const requireWrite = auth.requireScope('projects:write');

  router.get('/', requireRead, projectController.getProjects);
  router.post('/reorder', requireWrite, projectController.reorderProjects);
  router.get('/:id', requireRead, projectController.getProjectById);
  router.post('/', requireWrite, projectController.createProject);
  router.put('/:id', requireWrite, projectController.updateProject);
  router.delete('/:id', requireWrite, projectController.deleteProject);

  return router;
}
