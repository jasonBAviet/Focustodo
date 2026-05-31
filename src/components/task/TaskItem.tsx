import React, { useCallback } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { usePomodoroContext } from '../../contexts/PomodoroContext';
import type { Task } from '../../types';
import { dateUtils } from '../../utils/dateUtils';
import { IconPomodoro } from '../common/IconPomodoro';

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

interface PomodoroCountdownRingProps {
  isRunning: boolean;
  timeLeft: number;
  progressPercent: number;
}

const SMALL_R = 9;
const SMALL_C = 2 * Math.PI * SMALL_R;

const PomodoroCountdownRing: React.FC<PomodoroCountdownRingProps> = ({ timeLeft, progressPercent }) => {
  const dashOffset = SMALL_C * (1 - progressPercent / 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <svg width="24" height="24" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="12" cy="12" r={SMALL_R} stroke="var(--border)" strokeWidth="2" fill="none" />
        <circle
          cx="12" cy="12" r={SMALL_R}
          stroke="var(--accent)" strokeWidth="2" fill="none"
          strokeLinecap="round"
          strokeDasharray={SMALL_C}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.8s linear' }}
        />
      </svg>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', minWidth: 18 }}>
        {Math.ceil(timeLeft / 60)}m
      </span>
    </div>
  );
};

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
  const pomo = usePomodoroContext();

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

  const handleStartPomodoro = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    pomo.activateTask(task.id, task.title);
  }, [task.id, task.title, pomo]);

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
            <span className="task-item__pomo" style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {Array.from({ length: Math.min(task.pomodoroEstimate, 8) }).map((_, i) => (
                <IconPomodoro
                  key={i}
                  width="12"
                  height="12"
                  style={{ opacity: i < task.pomodoroCompleted ? 1 : 0.35 }}
                />
              ))}
              {task.pomodoroEstimate > 8 && (
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  +{task.pomodoroEstimate - 8}
                </span>
              )}
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

      {/* Pomodoro button / countdown ring */}
      {pomo.currentTaskId === task.id ? (
        <PomodoroCountdownRing
          isRunning={pomo.isRunning}
          timeLeft={pomo.timeLeft}
          progressPercent={pomo.progressPercent}
        />
      ) : (
        <button
          className="task-item__pomo-btn"
          onClick={handleStartPomodoro}
          title="Start Pomodoro"
          style={{ opacity: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-7 0c0 .83-.67 1.5-1.5 1.5S5 11.83 5 11s.67-1.5 1.5-1.5 1.5.67 1.5 1.5z" />
          </svg>
        </button>
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
        .task-item:hover .task-item__pomo-btn { opacity: 1; }
        .task-item__pomo-btn {
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); padding: 4px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          transition: opacity var(--transition-fast), color var(--transition-fast);
          flex-shrink: 0;
        }
        .task-item__pomo-btn:hover { color: var(--accent); }
      `}</style>
    </div>
  );
};

export default TaskItem;
