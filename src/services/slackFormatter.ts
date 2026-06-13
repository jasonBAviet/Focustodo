import type { Task } from '@/types';

function buildSlackMessageForReminder(task: Task): Record<string, unknown> {
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

function buildSlackMessageForCompleted(data: Record<string, unknown>): Record<string, unknown> {
  return {
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
}

function buildSlackMessageForCreated(data: Record<string, unknown>): Record<string, unknown> {
  return {
    text: `🆕 Task mới được tạo: *${data.title}*`
  };
}

function buildSlackMessageForPomodoroCompleted(data: Record<string, unknown>): Record<string, unknown> {
  return {
    text: `🍅 Hoàn thành một Pomodoro: *${data.taskTitle || 'Tự do'}* (${data.duration} phút)`
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
