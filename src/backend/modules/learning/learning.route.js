import { Router } from 'express';
import { learningController } from './learning.controller.js';
import { authenticateUser } from '../auth/auth.middleware.js';

export function createLearningRouter() {
  const router = Router();

  // Yêu cầu xác thực người dùng cho tất cả các endpoint học tập
  router.get('/', authenticateUser, learningController.getLearningData);
  router.post('/mark', authenticateUser, learningController.markItem);

  return router;
}
