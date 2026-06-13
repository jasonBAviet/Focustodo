import { Router } from 'express';
import { taskController } from './task.controller.js';

export function createTasksRouter(pool, auth) {
  const router = Router();
  const requireRead = auth.requireScope('tasks:read');
  const requireWrite = auth.requireScope('tasks:write');

  router.get('/', requireRead, taskController.getTasks);
  router.post('/reorder', requireWrite, taskController.reorderTasks);
  router.get('/:id', requireRead, taskController.getTaskById);
  router.post('/', requireWrite, taskController.createTask);
  router.patch('/:id/complete', requireWrite, taskController.completeTask);
  router.put('/:id', requireWrite, taskController.updateTask);
  router.delete('/:id', requireWrite, taskController.deleteTask);

  return router;
}
