import { webhookService } from './webhook.service.js';

export class WebhookController {
  async listSubscribers(req, res) {
    try {
      const data = await webhookService.getSubscribers(req.user.id);
      res.json({ data });
    } catch (err) {
      console.error('[GET /api/webhooks/subscribers]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createSubscriber(req, res) {
    try {
      const row = await webhookService.createSubscriber(req.user.id, req.body ?? {});
      res.status(201).json({ data: row });
    } catch (err) {
      if (err.message.includes('bat buoc') || err.message.includes('hop le')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('[POST /api/webhooks/subscribers]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async toggleSubscriber(req, res) {
    try {
      const { enabled } = req.body ?? {};
      const row = await webhookService.toggleSubscriber(req.params.id, req.user.id, !!enabled);
      res.json({ data: row });
    } catch (err) {
      if (err.message.includes('khong ton tai')) return res.status(404).json({ error: err.message });
      console.error('[PATCH /api/webhooks/subscribers/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteSubscriber(req, res) {
    try {
      await webhookService.deleteSubscriber(req.params.id, req.user.id);
      res.json({ message: 'Da xoa subscriber.' });
    } catch (err) {
      if (err.message.includes('khong ton tai')) return res.status(404).json({ error: err.message });
      console.error('[DELETE /api/webhooks/subscribers/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const webhookController = new WebhookController();
