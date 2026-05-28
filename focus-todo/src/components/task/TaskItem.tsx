import React, { useCallback } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import type { Task } from '../../types';
import { dateUtils } from '../../utils/dateUtils';
import { IconPomodoro } from '../common/IconPomodoro';

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const PriorityDot: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
  const colors: Record<string, string> = {
    high: '#f25f5c',
    medium: '#f4a261',
    low: '#2ec4b6',
    none: 'transparent',
  };
  if (priority === 'none') return null;
  return (
    <span
      className="task-item__priority-dot"
      style={{ background: colors[priority] }}
      title={`Uu tien: ${priority}`}
    />
  );
};

const CheckCircle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    className={`task-item__check ${checked ? 'checked' : ''}`}
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    aria-label={checked ? 'Danh dau chua hoan thanh' : 'Danh dau hoan thanh'}
  >
    {checked && (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M2 5l2.5 2.5L8 3"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="task-item__checkmark"
        />
      </svg>
    )}
  </button>
);

const TaskItem: React.FC<TaskItemProps> = ({ task, isSelected, onContextMenu }) => {
  const { completeTask, restoreTask, setSelectedTaskId } = useTaskContext();

  const handleToggle = useCallback(() => {
    if (task.completed) {
      restoreTask(task.id);
    } else {
      completeTask(task.id);
    }
  }, [task.id, task.completed, completeTask, restoreTask]);

  const handleSelect = useCallback(() => {
    setSelectedTaskId(task.id);
  }, [task.id, setSelectedTaskId]);

  const dueDateClass = task.dueDate && dateUtils.isOverdue(task.dueDate) && !task.completed
    ? 'overdue'
    : '';

  const completedDateText = task.completed && task.completedAt
    ? dateUtils.formatShort(task.completedAt)
    : '';

  const subtasksDone = task.subtasks.filter((s) => s.completed).length;
  const hasSubtasks = task.subtasks.length > 0;

  return (
    <div
      className={`task-item ${isSelected ? 'selected' : ''} ${task.completed ? 'completed' : ''}`}
      onClick={handleSelect}
      onContextMenu={onContextMenu}
    >
      <CheckCircle checked={task.completed} onChange={handleToggle} />
      <PriorityDot priority={task.priority} />

      <div className="task-item__body">
        <span className="task-item__title">{task.title}</span>
        <div className="task-item__meta">
          {hasSubtasks && (
            <span className="task-item__subtask-count">
              {subtasksDone}/{task.subtasks.length}
            </span>
          )}
          {task.pomodoroEstimate > 0 && (
            <span className="task-item__pomo">
              <IconPomodoro width="14" height="14" />
              {task.pomodoroCompleted}/{task.pomodoroEstimate}
            </span>
          )}
        </div>
      </div>

      {task.dueDate && !task.completed && (
        <span className={`task-item__due ${dueDateClass}`}>
          {dateUtils.formatShort(task.dueDate)}
        </span>
      )}
      {task.completed && completedDateText && (
        <span className="task-item__completed-date">
          {completedDateText}
        </span>
      )}

      <style>{`
        .task-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid var(--task-border-bottom);
          background: var(--task-bg);
          cursor: pointer;
          transition: background var(--transition-fast);
          border-radius: 0;
          min-height: 44px;
        }
        .task-item:hover { background: var(--task-bg-hover); }
        .task-item.selected { background: var(--task-bg-selected); }
        .task-item.completed .task-item__title {
          color: var(--text-tertiary);
          text-decoration: line-through;
        }
        .task-item__check {
          width: 18px; height: 18px; border-radius: 50%;
          border: 1.5px solid var(--border-strong);
          background: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
        }
        .task-item__check:hover { border-color: var(--accent); transform: scale(1.1); }
        .task-item__check.checked {
          background: var(--accent); border-color: var(--accent);
          animation: task-check 300ms ease both;
        }
        .task-item__checkmark {
          stroke-dasharray: 30;
          stroke-dashoffset: 0;
          animation: checkmark-draw 200ms ease both;
        }
        .task-item__priority-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .task-item__body {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 2px;
        }
        .task-item__title {
          font-size: var(--text-base);
          color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .task-item__meta {
          display: flex; gap: 8px; align-items: center;
        }
        .task-item__subtask-count, .task-item__pomo {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          display: flex; align-items: center; gap: 3px;
        }
        .task-item__due {
          font-size: var(--text-xs); color: var(--text-tertiary); flex-shrink: 0;
        }
        .task-item__due.overdue { color: var(--priority-high); font-weight: 500; }
        .task-item__completed-date {
          font-size: var(--text-xs); color: var(--stat-blue); flex-shrink: 0;
          background: rgba(76,201,240,0.1); padding: 2px 8px; border-radius: var(--radius-full);
        }
      `}</style>
    </div>
  );
};

export default TaskItem;
