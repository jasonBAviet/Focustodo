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

        // 1. Legacy single-URL from settings table
        if (settings?.webhook_enabled && settings.webhook_url) {
          const url = String(settings.webhook_url).trim();
          if (isSafeWebhookUrl(url)) {
            const reqHeaders = { 'Content-Type': 'application/json', 'X-Webhook-Event': eventType };
            const reqBody = JSON.stringify(payload);
            this.sendWebhookWithRetryAndLog(url, reqHeaders, reqBody, eventType, userId, null)
              .catch((err) => console.error('[WebhookService.dispatchToAll] Legacy webhook error:', err));
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

          this.sendWebhookWithRetryAndLog(sub.url, reqHeaders, reqBody, eventType, userId, sub.id)
            .then((result) => {
              if (result.success) {
                webhookRepository.updateLastTriggered(sub.id, new Date().toISOString()).catch(() => {});
              }
            })
            .catch((err) => console.error('[WebhookService.dispatchToAll] Subscriber webhook error:', err));
        }
      } catch (err) {
        console.error('[WebhookService.dispatchToAll]', err);
      }
    }, 0);
  }

  async sendWebhookWithRetryAndLog(url, headers, body, eventType, userId, subscriberId = null) {
    const maxRetries = 3;
    const initialDelay = 2000;
    let attempt = 0;
    let success = false;
    let lastHttpStatus = null;
    let lastError = null;

    while (attempt <= maxRetries && !success) {
      attempt++;
      const timestamp = new Date().toISOString();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        lastHttpStatus = response.status;
        if (response.ok) {
          success = true;
          lastError = null;
        } else {
          lastError = `HTTP Error ${response.status}: ${response.statusText}`;
        }
      } catch (err) {
        lastHttpStatus = null;
        lastError = err.message || String(err);
      } finally {
        clearTimeout(timeoutId);
      }

      // Ghi log vao database cho moi lan dispatch
      try {
        await webhookRepository.insertDeliveryLog({
          id: randomUUID(),
          userId,
          subscriberId,
          event: eventType,
          httpStatus: lastHttpStatus,
          error: lastError,
          timestamp,
        });
      } catch (logErr) {
        console.error('[WebhookService] Failed to insert delivery log:', logErr);
      }

      if (success) {
        break;
      }

      if (attempt <= maxRetries) {
        const backoffDelay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }

    return { success, lastHttpStatus, lastError };
  }

  async cleanOldLogs() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const count = await webhookRepository.deleteLogsOlderThan(thirtyDaysAgo);
      if (count > 0) {
        console.log(`[WebhookService.cleanOldLogs] Da don dep ${count} logs webhook cu hon 30 ngay.`);
      }
      return count;
    } catch (err) {
      console.error('[WebhookService.cleanOldLogs] Loi khi don dep logs cu:', err);
      return 0;
    }
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
