import { Router } from 'express';
import { webhookController } from './webhook.controller.js';
import { authenticateUser } from '../auth/auth.middleware.js';

export function createWebhookRouter() {
  const router = Router();
  router.use(authenticateUser);
  router.get('/subscribers', webhookController.listSubscribers.bind(webhookController));
  router.post('/subscribers', webhookController.createSubscriber.bind(webhookController));
  router.patch('/subscribers/:id', webhookController.toggleSubscriber.bind(webhookController));
  router.delete('/subscribers/:id', webhookController.deleteSubscriber.bind(webhookController));
  return router;
}
