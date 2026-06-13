import crypto from 'crypto';
import { URL } from 'url';
import { randomUUID } from 'crypto';
import { webhookRepository } from './webhook.repository.js';
import { taskRepository } from '../tasks/task.repository.js';

const VALID_EVENTS = ['task.created', 'task.updated', 'task.deleted', 'task.completed', 'pomodoro.completed'];

function isSafeWebhookUrl(rawUrl) {
  if (!rawUrl) return false;
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return false; }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  const BLOCKED = [
    /^localhost$/, /^127\./, /^0\.0\.0\.0$/, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./, /^169\.254\./, /^::1$/, /^fc00:/, /^fe80:/, /metadata\.google\.internal/,
  ];
  return !BLOCKED.some((r) => r.test(host));
}

function buildPayload(eventType, taskData) {
  return {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: taskData || {},
  };
}

function signedHeaders(payload, secret, eventType) {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return {
    headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': eventType, 'X-Webhook-Signature': `sha256=${sig}` },
    body,
  };
}

export class WebhookService {
  // Called after every task mutation — dispatches to legacy single-URL + all subscribers
  dispatchToAll(userId, eventType, taskData) {
    if (!userId) return;
    setTimeout(async () => {
      try {
        const [subscribers, settings] = await Promise.all([
          webhookRepository.getSubscribers(userId),
          taskRepository.getWebhookSettings(userId),
        ]);

        const payload = buildPayload(eventType, taskData);
        const now = new Date().toISOString();

        // 1. Legacy single-URL from settings table
        if (settings?.webhook_enabled && settings.webhook_url) {
          const url = String(settings.webhook_url).trim();
          if (isSafeWebhookUrl(url)) {
            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': eventType },
              body: JSON.stringify(payload),
            }).catch(() => {});
          }
        }

        // 2. All registered subscribers
        for (const sub of subscribers) {
          if (!sub.enabled) continue;
          const events = Array.isArray(sub.events) ? sub.events : VALID_EVENTS.slice(0, 4);
          if (!events.includes(eventType)) continue;
          if (!isSafeWebhookUrl(sub.url)) continue;

          let reqHeaders = { 'Content-Type': 'application/json', 'X-Webhook-Event': eventType };
          let reqBody = JSON.stringify(payload);
          if (sub.secret) {
            const signed = signedHeaders(payload, sub.secret, eventType);
            reqHeaders = signed.headers;
            reqBody = signed.body;
          }

          fetch(sub.url, { method: 'POST', headers: reqHeaders, body: reqBody })
            .then(() => webhookRepository.updateLastTriggered(sub.id, now))
            .catch(() => {});
        }
      } catch (err) {
        console.error('[WebhookService.dispatchToAll]', err);
      }
    }, 0);
  }

  async getSubscribers(userId) {
    return await webhookRepository.getSubscribers(userId);
  }

  async createSubscriber(userId, body) {
    const { name, url, events, secret } = body;
    if (!name || typeof name !== 'string' || !name.trim()) throw new Error('name la bat buoc.');
    if (!url || typeof url !== 'string' || !url.trim()) throw new Error('url la bat buoc.');
    if (!isSafeWebhookUrl(url.trim())) throw new Error('URL khong hop le. Chi chap nhan HTTPS public URL.');

    const eventList = Array.isArray(events) && events.length > 0
      ? events.filter(e => VALID_EVENTS.includes(e))
      : VALID_EVENTS.slice(0, 4);

    return await webhookRepository.insertSubscriber({
      id: randomUUID(),
      userId,
      name: name.trim(),
      url: url.trim(),
      events: eventList,
      secret: secret?.trim() || null,
    });
  }

  async toggleSubscriber(id, userId, enabled) {
    const row = await webhookRepository.updateSubscriber(id, userId, { enabled });
    if (!row) throw new Error('Subscriber khong ton tai.');
    return row;
  }

  async deleteSubscriber(id, userId) {
    const row = await webhookRepository.deleteSubscriber(id, userId);
    if (!row) throw new Error('Subscriber khong ton tai.');
    return row;
  }
}

export const webhookService = new WebhookService();
