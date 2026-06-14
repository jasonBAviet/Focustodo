import type { Task } from '@/types';

function buildSlackMessageForReminder(task: Task): Record<string, unknown> {
  const priorityColor = {
    high: '#f25f5c',
    medium: '#f4a261',
    low: '#2ec4b6',
    none: '#888',
  }[task.priority] || '#888';

  const priorityLabel = {
    high: 'High priority',
    medium: 'Medium priority',
    low: 'Low priority',
    none: 'No priority',
  }[task.priority] || 'No priority';

  const dueDateText = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US')
    : 'None';

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⏰ Task Reminder*\n_You have a task to do_`,
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
            text: `*Title*\n${task.title}`,
          },
          {
            type: 'mrkdwn',
            text: `*Priority*\n${priorityLabel}`,
          },
          {
            type: 'mrkdwn',
            text: `*Due Date*\n${dueDateText}`,
          },
          {
            type: 'mrkdwn',
            text: `*Time*\n${new Date().toLocaleTimeString('en-US', {
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
                text: `*Note*\n${task.note}`,
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

function buildSlackMessageForCompleted(data: Record<string, unknown>): Record<string, unknown> {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*✅ Task Completed*\n_You just completed a task!_`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Title*\n${data.title}`,
          },
          {
            type: 'mrkdwn',
            text: `*Focus Time*\n${data.totalFocusTime} minutes (${data.pomodoroCompleted} Pomodoro)`,
          },
        ],
      },
    ],
  };
}

function buildSlackMessageForCreated(data: Record<string, unknown>): Record<string, unknown> {
  return {
    text: `🆕 New task created: *${data.title}*`
  };
}

function buildSlackMessageForPomodoroCompleted(data: Record<string, unknown>): Record<string, unknown> {
  return {
    text: `🍅 Pomodoro completed: *${data.taskTitle || 'Free'}* (${data.duration} minutes)`
  };
}

export function buildSlackPayload(
  eventType: string,
  data: Record<string, unknown>
): Record<string, unknown> | null {
  switch (eventType) {
    case 'task.reminded':
      return buildSlackMessageForReminder(data as unknown as Task);
    case 'task.completed':
      return buildSlackMessageForCompleted(data);
    case 'task.created':
      return buildSlackMessageForCreated(data);
    case 'pomodoro.completed':
      return buildSlackMessageForPomodoroCompleted(data);
    default:
      return null;
  }
}
