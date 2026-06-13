import { Router } from 'express';
import { tagController } from './tag.controller.js';

export function createTagsRouter(pool, auth) {
  const router = Router();
  const requireRead = auth.requireScope('tags:read');
  const requireWrite = auth.requireScope('tags:write');

  router.get('/', requireRead, tagController.getTags);
  router.get('/:id', requireRead, tagController.getTagById);
  router.post('/', requireWrite, tagController.createTag);
  router.put('/:id', requireWrite, tagController.updateTag);
  router.delete('/:id', requireWrite, tagController.deleteTag);

  return router;
}
