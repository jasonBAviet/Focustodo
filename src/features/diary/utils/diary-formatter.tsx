import React from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';

interface TaskBadgeProps {
  taskId: string;
  defaultLabel: string;
}

const TaskBadge: React.FC<TaskBadgeProps> = ({ taskId, defaultLabel }) => {
  const { tasks, setSelectedTaskId } = useTaskContext();
  const task = tasks.find((t) => t.id === taskId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskId(taskId);
  };

  const isCompleted = task ? task.completed : false;
  const label = task ? task.title : defaultLabel;
  const priority = task ? task.priority : 'none';

  // Lay mau sac theo muc do uu tien
  const getPriorityColor = () => {
    switch (priority) {
      case 'high': return '#f25f5c';
      case 'medium': return '#f4a261';
      case 'low': return '#2ec4b6';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <span
      className={`diary-task-badge ${isCompleted ? 'completed' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${getPriorityColor()}`,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        color: isCompleted ? 'var(--text-disabled)' : 'var(--text-primary)',
        cursor: 'pointer',
        textDecoration: isCompleted ? 'line-through' : 'none',
        margin: '2px 4px',
        verticalAlign: 'middle',
        transition: 'all var(--transition-fast)',
      }}
      onClick={handleClick}
      title="Click để xem chi tiết công việc"
    >
      <span style={{ display: 'flex', alignItems: 'center', color: getPriorityColor() }}>
        {isCompleted ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        )}
      </span>
      <span className="truncate" style={{ maxWidth: '180px' }}>{label}</span>
    </span>
  );
};

function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Regex de parse chu dam, nghieng, link task:// va cac tieu de highlight
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(task:\/\/[-a-zA-Z0-9]+\)|🏆 Thành quả đạt được|🧩 Khó khăn & Bài học|💭 Cảm nhận & Suy nghĩ|🎯 Mục tiêu tiếp theo)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    // Bold parsing
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    // Italic parsing
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    // Task Link parsing: [Tên Task](task://task-id)
    if (part.startsWith('[') && part.includes('](task://')) {
      const match = part.match(/\[([^\]]+)\]\(task:\/\/([-a-zA-Z0-9]+)\)/);
      if (match) {
        const [, label, taskId] = match;
        return <TaskBadge key={idx} taskId={taskId} defaultLabel={label} />;
      }
    }

    // Highlight headers
    const lowerPart = part.toLowerCase();
    if (lowerPart.includes('thành quả đạt được') || lowerPart.includes('khó khăn & bài học') || lowerPart.includes('cảm nhận & suy nghĩ') || lowerPart.includes('mục tiêu tiếp theo')) {
      return (
        <span
          key={idx}
          style={{
            color: 'var(--accent)',
            fontWeight: 'bold',
            display: 'inline-block',
            margin: '4px 0',
          }}
        >
          {part}
        </span>
      );
    }

    return part;
  });
}

export function formatDiaryContent(noteText: string): React.ReactNode {
  if (!noteText) return null;

  const lines = noteText.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', lineBreak: 'anywhere', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
      {lines.map((line, idx) => {
        if (line.trim() === '') {
          return <div key={idx} style={{ height: '4px' }} />;
        }

        // Check if header markdown (###)
        if (line.startsWith('### ')) {
          return (
            <h4
              key={idx}
              style={{
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: '12px 0 4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {parseInline(line.substring(4))}
            </h4>
          );
        }

        // List item parsing
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '6px', paddingLeft: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--text-tertiary)', marginTop: '1px' }}>•</span>
              <div style={{ flex: 1 }}>{parseInline(line.substring(2))}</div>
            </div>
          );
        }

        return <div key={idx}>{parseInline(line)}</div>;
      })}
    </div>
  );
}
