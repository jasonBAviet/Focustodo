import { Router } from 'express';
import { authenticateUser } from '../src/backend/modules/auth/auth.middleware.js';

const router = Router();

// POST /api/notify/slack
// Frontend gui eventType + data, backend doc SLACK_WEBHOOK_URL tu bien moi truong server.
// Slack webhook URL khong bao gio lo ra phia client.
router.post('/slack', authenticateUser, async (req, res) => {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    return res.status(503).json({ error: 'Slack webhook chua duoc cau hinh tren server.' });
  }

  const { eventType, slackPayload } = req.body ?? {};
  if (!eventType || !slackPayload) {
    return res.status(400).json({ error: 'eventType va slackPayload la bat buoc.' });
  }

  // Chi chap nhan eventType hop le de chong spam
  const ALLOWED_EVENTS = ['task.reminded', 'task.completed', 'task.created', 'pomodoro.completed'];
  if (!ALLOWED_EVENTS.includes(String(eventType))) {
    return res.status(400).json({ error: 'eventType khong hop le.' });
  }

  try {
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Slack webhook tra ve loi.', code: response.status });
    }

    res.json({ status: 'ok', message: 'Da gui thong bao Slack thanh cong.' });
  } catch (err) {
    console.error('[POST /api/notify/slack]', err);
    res.status(500).json({ error: 'Loi khi gui thong bao Slack.' });
  }
});

export default router;
