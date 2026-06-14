import { useCallback } from 'react';
import type { WebhookEvent, Task, PomodoroSession } from '@/types';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import { buildSlackPayload } from '@/services/slackFormatter';
import { uuid } from '@/utils/uuid';
import { loadToken } from '@/utils/secureStorage';

type WebhookEventType = WebhookEvent['eventType'];

interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}


function useWebhook(webhookUrl: string, webhookEnabled: boolean) {
  const [webhookEvents, setWebhookEvents] = useLocalStorage<WebhookEvent[]>(
    'ftd_webhook_events',
    []
  );

  const buildPayload = useCallback(
    (eventType: WebhookEventType, data: Record<string, unknown>): WebhookPayload => ({
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    }),
    []
  );

  const trigger = useCallback(
    async (eventType: WebhookEventType, data: Record<string, unknown>) => {
      const payload = buildPayload(eventType, data);

      const eventRecord: WebhookEvent = {
        id: uuid(),
        eventType,
        payload: { ...payload },
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      if (!webhookEnabled || !webhookUrl) {
        setWebhookEvents((prev) => [eventRecord, ...prev].slice(0, 50));
        return;
      }

      try {
        const token = await loadToken();
        const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

        // If Slack webhook: send via separate backend route (URL not exposed to client)
        if (webhookUrl.includes('hooks.slack.com')) {
          const slackPayload = buildSlackPayload(eventType, data);
          if (!slackPayload) {
            eventRecord.status = 'error';
            setWebhookEvents((prev) => [eventRecord, ...prev].slice(0, 50));
            return;
          }
          const res = await fetch('/api/notify/slack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ eventType, slackPayload }),
          });
          eventRecord.status = res.ok ? 'success' : 'error';
        } else {
          // Non-Slack webhook: proxy via /api/webhook/test (needs auth)
          const res = await fetch('/api/webhook/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ webhookUrl, payload }),
          });
          const responseData = await res.json();
          eventRecord.status = res.ok ? 'success' : 'error';
          eventRecord.statusCode = responseData.code;
        }
      } catch (err) {
        eventRecord.status = 'error';
        eventRecord.error = err instanceof Error ? err.message : String(err);
      }

      setWebhookEvents((prev) => [eventRecord, ...prev].slice(0, 50));
    },
    [webhookUrl, webhookEnabled, buildPayload, setWebhookEvents]
  );

  const onTaskCreated = useCallback(
    (task: Task) =>
      trigger('task.created', {
        id: task.id,
        title: task.title,
        priority: task.priority,
        projectId: task.projectId,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
      }),
    [trigger]
  );

  const onTaskCompleted = useCallback(
    (task: Task) =>
      trigger('task.completed', {
        id: task.id,
        title: task.title,
        pomodoroCompleted: task.pomodoroCompleted,
        totalFocusTime: task.totalFocusTime,
        completedAt: task.completedAt,
      }),
    [trigger]
  );

  const onPomodoroCompleted = useCallback(
    (session: PomodoroSession) =>
      trigger('pomodoro.completed', {
        id: session.id,
        taskId: session.taskId,
        taskTitle: session.taskTitle,
        duration: session.duration,
        type: session.type,
        startTime: session.startTime,
        endTime: session.endTime,
      }),
    [trigger]
  );

  const onTaskReminded = useCallback(
    (task: Task) =>
      trigger('task.reminded', {
        id: task.id,
        title: task.title,
        priority: task.priority,
        projectId: task.projectId,
        dueDate: task.dueDate,
        reminder: task.reminder,
        note: task.note,
      }),
    [trigger]
  );

  const clearEvents = useCallback(() => setWebhookEvents([]), [setWebhookEvents]);

  return {
    webhookEvents,
    onTaskCreated,
    onTaskCompleted,
    onPomodoroCompleted,
    onTaskReminded,
    clearEvents,
    trigger,
  };
}

export default useWebhook;
