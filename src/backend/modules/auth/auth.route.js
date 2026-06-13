import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticateUser, requireAdmin, requireScope } from './auth.middleware.js';

// Route danh cho ung dung (SPA) dang ky / dang nhap
export function createUserAuthRouter() {
  const router = Router();
  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.get('/me', authenticateUser, authController.getMe);
  // API keys cua chinh user (scope: tasks)
  router.get('/keys', authenticateUser, authController.getUserApiKeys.bind(authController));
  router.post('/keys', authenticateUser, authController.createUserApiKey.bind(authController));
  router.delete('/keys/:id', authenticateUser, authController.revokeUserApiKey.bind(authController));
  return router;
}

// Route danh cho viec quan ly API Keys (Admin)
export function createApiKeysRouter() {
  const router = Router();
  router.use(requireAdmin);
  router.post('/', authController.createApiKey);
  router.get('/', authController.getAllApiKeys);
  router.delete('/:id', authController.revokeApiKey);
  return router;
}

// Helper export de maintain tuong thich code hien tai neu can
export function createAuth() {
  return {
    requireScope,
    requireAdmin,
    keysRouter: createApiKeysRouter()
  };
}
