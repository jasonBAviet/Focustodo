import { Router } from 'express';
import { folderController } from './folder.controller.js';

export function createFoldersRouter(pool, auth) {
  const router = Router();
  const requireRead = auth.requireScope('folders:read');
  const requireWrite = auth.requireScope('folders:write');

  router.get('/', requireRead, folderController.getFolders);
  router.post('/reorder', requireWrite, folderController.reorderFolders);
  router.get('/:id', requireRead, folderController.getFolderById);
  router.post('/', requireWrite, folderController.createFolder);
  router.put('/:id', requireWrite, folderController.updateFolder);
  router.delete('/:id', requireWrite, folderController.deleteFolder);

  return router;
}
