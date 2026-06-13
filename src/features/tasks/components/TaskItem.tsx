import React, { useCallback } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { usePomodoroContext } from '@/features/pomodoro/PomodoroContext';
import type { Task, Tag } from '@/types';
import { dateUtils } from '@/utils/dateUtils';
import { useInjectedStyle } from '@/shared/hooks/useInjectedStyle';

const TASK_ITEM_CSS = `
        .task-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-2-5);
          padding: var(--space-2-5) var(--space-3);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-card, var(--task-bg));
          cursor: pointer;
          transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
          min-height: 44px;
          height: auto;
          flex-shrink: 0;
        }
        .task-item:hover {
          background: var(--task-bg-hover);
          border-color: var(--border-strong);
        }
        .task-item.selected {
          background: var(--task-bg-selected);
          border-color: var(--accent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent);
        }
        .task-item.completed .task-item__title {
          color: var(--text-tertiary);
          text-decoration: line-through;
        }
        .task-item__check {
          width: 18px; height: 18px; border-radius: 50%;
          border: 1.5px solid var(--border-strong);
          background: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
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
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px;
        }
        .task-item__body {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: var(--space-1-5);
        }
        .task-item__row1 {
          display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3);
        }
        .task-item__row2 {
          display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1-5); min-width: 0;
        }
        .task-item__title {
          font-size: var(--text-md);
          line-height: 1.4;
          color: var(--text-primary);
        }
        .task-item__subtask-count {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          display: flex; align-items: center; gap: 3px;
        }
        .task-item__pomo-pill {
          display: flex; align-items: center; gap: 3px;
          background: rgba(255,255,255,0.07);
          border: 1px solid var(--border);
          padding: 2px var(--space-1-5); border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background var(--transition-fast), border-color var(--transition-fast);
        }
        .task-item__pomo-pill:hover {
          background: rgba(255,255,255,0.12);
          border-color: var(--border-strong);
        }
        .task-item__due {
          display: flex; align-items: center; gap: var(--space-1);
          font-size: var(--text-xs); color: var(--text-tertiary);
          flex-shrink: 0; white-space: nowrap; margin-top: 1px;
        }
        .task-item__due.overdue { color: var(--priority-high); font-weight: 500; }
        .task-item__completed-date {
          font-size: var(--text-xs); color: var(--stat-blue); flex-shrink: 0;
          background: rgba(76,201,240,0.1); padding: 2px 8px; border-radius: var(--radius-full);
          align-self: flex-start;
        }
        .task-item__tag-badge {
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1;
          padding: 2px var(--space-2);
          border-radius: var(--radius-full);
          opacity: 0.5;
          cursor: default;
          transition: opacity var(--transition-fast);
        }
        .task-item__tag-badge:hover { opacity: 1; }
        .task-item__more-btn {
          opacity: 0;
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); padding: var(--space-1); border-radius: var(--radius-xs);
          display: flex; align-items: center; flex-shrink: 0; margin-top: 1px;
          transition: opacity var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
        }
        .task-item:hover .task-item__more-btn { opacity: 1; }
        .task-item__more-btn:hover { color: var(--text-primary); background: var(--bg-card-hover, rgba(255,255,255,0.07)); }
        @media (hover: none) {
          .task-item__more-btn { opacity: 1; }
        }
`;

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
      <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', minWidth: 18 }}>
        {Math.ceil(timeLeft / 60)}m
      </span>
    </div>
  );
};

const TomatoIconDot: React.FC<{ done: boolean }> = ({ done }) => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    style={{
      filter: done ? 'drop-shadow(0 0 3px rgba(239,68,68,0.5))' : 'grayscale(1)',
      opacity: done ? 1 : 0.3,
      flexShrink: 0,
      transition: 'opacity 0.2s',
    }}
  >
    <ellipse cx="12" cy="14.5" rx="8.5" ry="7.5" fill="#ef4444" />
    <path d="M12 7 C12 4 9 2 6 2 C10 2 11.5 4 12 5.5 C12.5 4 14 2 18 2 C15 2 12 4 12 7 Z" fill="#22c55e" />
    {done && (
      <path d="M6.5 13 A 5.5 5.5 0 0 0 9.5 19.5" stroke="#fca5a5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    )}
  </svg>
);

const IconCalSmall: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconMoreVert: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const PriorityDot: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
  const colors: Record<string, string> = {
    high: 'var(--priority-high)',
    medium: 'var(--priority-medium)',
    low: 'var(--priority-low)',
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
  const { completeTask, restoreTask, setSelectedTaskId, projects: _projects, tags } = useTaskContext();
  const pomo = usePomodoroContext();
  useInjectedStyle('task-item', TASK_ITEM_CSS);

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

  const taskTags = (task.tags || [])
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => !!t);

  const hasRow2 = hasSubtasks || (task.pomodoroEstimate > 0) || taskTags.length > 0;

  return (
    <div
      className={`task-item ${isSelected ? 'selected' : ''} ${task.completed ? 'completed' : ''}`}
      onClick={handleSelect}
      onContextMenu={onContextMenu}
    >
      <CheckCircle checked={task.completed} onChange={handleToggle} />
      <PriorityDot priority={task.priority} />

      <div className="task-item__body">
        {/* Hàng 1: tiêu đề + ngày hạn */}
        <div className="task-item__row1">
          <span className="task-item__title">{task.title}</span>
          {task.dueDate && !task.completed && (
            <span className={`task-item__due ${dueDateClass}`}>
              <IconCalSmall />
              {dateUtils.formatShort(task.dueDate)}
            </span>
          )}
        </div>

        {/* Hàng 2: pomodoro pill + countdown + tags */}
        {hasRow2 && (
          <div className="task-item__row2">
            {hasSubtasks && (
              <span className="task-item__subtask-count">
                {subtasksDone}/{task.subtasks.length}
              </span>
            )}

            {task.pomodoroEstimate > 0 && pomo.currentTaskId !== task.id && (
              <div
                className="task-item__pomo-pill"
                onClick={handleStartPomodoro}
                title={`${task.pomodoroCompleted}/${task.pomodoroEstimate} Pomodoro — click để bắt đầu`}
              >
                {Array.from({ length: Math.min(task.pomodoroEstimate, 4) }).map((_, i) => (
                  <TomatoIconDot key={i} done={i < task.pomodoroCompleted} />
                ))}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginLeft: 2 }}>
                  {task.pomodoroCompleted}/{task.pomodoroEstimate}
                </span>
              </div>
            )}

            {pomo.currentTaskId === task.id && (
              <PomodoroCountdownRing
                isRunning={pomo.isRunning}
                timeLeft={pomo.timeLeft}
                progressPercent={pomo.progressPercent}
              />
            )}

            {taskTags.map((tag) => (
              <span
                key={tag.id}
                className="task-item__tag-badge"
                style={{ color: tag.color, background: tag.color + '1a' }}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {task.completed && completedDateText && (
          <span className="task-item__completed-date">{completedDateText}</span>
        )}
      </div>

      {/* Nút ... xuất hiện khi hover → mở context menu */}
      <button
        className="task-item__more-btn"
        onClick={(e) => { e.stopPropagation(); onContextMenu?.(e); }}
        title="Tùy chọn"
      >
        <IconMoreVert />
      </button>
    </div>
  );
};

export default TaskItem;
