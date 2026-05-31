import { useCallback } from 'react';
import type { WebhookEvent, Task, PomodoroSession } from '../types';
import useLocalStorage from './useLocalStorage';

type WebhookEventType = WebhookEvent['eventType'];

interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

// Helper: Build Slack Block Kit message for task reminders
function buildSlackMessage(task: Task): Record<string, unknown> {
  const priorityColor = {
    high: '#f25f5c',
    medium: '#f4a261',
    low: '#2ec4b6',
    none: '#888',
  }[task.priority] || '#888';

  const priorityLabel = {
    high: 'Ưu tiên cao',
    medium: 'Ưu tiên trung bình',
    low: 'Ưu tiên thấp',
    none: 'Không ưu tiên',
  }[task.priority] || 'Không ưu tiên';

  const dueDateText = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('vi-VN')
    : 'Không có';

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⏰ Task Reminder*\n_Bạn có một task cần thực hiện_`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Tiêu đề*\n${task.title}`,
          },
          {
            type: 'mrkdwn',
            text: `*Ưu tiên*\n${priorityLabel}`,
          },
          {
            type: 'mrkdwn',
            text: `*Hạn chót*\n${dueDateText}`,
          },
          {
            type: 'mrkdwn',
            text: `*Thời gian*\n${new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}`,
          },
        ],
      },
      ...(task.note
        ? [
            {
              type: 'divider',
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Ghi chú*\n${task.note}`,
              },
            },
          ]
        : []),
    ],
    attachments: [
      {
        color: priorityColor,
        footer: 'Focus To-Do',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
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
        // Special handling for Slack webhooks
        let bodyToSend: unknown = payload;
        
        if (webhookUrl.includes('hooks.slack.com')) {
          if (eventType === 'task.reminded' && (data as any).title !== undefined) {
            const task = data as unknown as Task;
            bodyToSend = buildSlackMessage(task);
          } else if (eventType === 'task.completed') {
            bodyToSend = {
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*✅ Task Completed*\n_Bạn vừa hoàn thành một công việc!_`,
                  },
                },
                { type: 'divider' },
                {
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Tiêu đề*\n${data.title}`,
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Thời gian tập trung*\n${data.totalFocusTime} phút (${data.pomodoroCompleted} Pomodoro)`,
                    },
                  ],
                },
              ],
            };
          } else if (eventType === 'task.created') {
            bodyToSend = {
              text: `🆕 Task mới được tạo: *${data.title}*`
            };
          } else if (eventType === 'pomodoro.completed') {
            bodyToSend = {
              text: `🍅 Hoàn thành một Pomodoro: *${data.taskTitle || 'Tự do'}* (${data.duration} phút)`
            };
          }
        }

        const res = await fetch('/api/webhook/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl,
            payload: bodyToSend,
          }),
        });
        const responseData = await res.json();
        eventRecord.status = res.ok ? 'success' : 'error';
        eventRecord.statusCode = responseData.code;
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
