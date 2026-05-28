import { useCallback } from 'react';
import type { WebhookEvent, Task, PomodoroSession } from '../types';
import useLocalStorage from './useLocalStorage';

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
        id: crypto.randomUUID(),
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
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        eventRecord.status = res.ok ? 'success' : 'error';
        eventRecord.statusCode = res.status;
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

  const clearEvents = useCallback(() => setWebhookEvents([]), [setWebhookEvents]);

  return {
    webhookEvents,
    onTaskCreated,
    onTaskCompleted,
    onPomodoroCompleted,
    clearEvents,
    trigger,
  };
}

export default useWebhook;
