import React, { useMemo } from 'react';
import ContextMenu from '../common/ContextMenu';
import { useTaskContext } from '../../contexts/TaskContext';
import { IconPomodoro } from '../common/IconPomodoro';
import type { Priority } from '../../types';

interface TaskContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
}

const IconFlag = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 14 14" fill={color}>
    <path d="M2 2h10l-2 4 2 4H2l2-4-2-4z"/>
  </svg>
);

const PRIORITY_OPTIONS: { value: Priority; color: string }[] = [
  { value: 'none', color: '#e0e0e0' },
  { value: 'low', color: '#4ade80' },
  { value: 'medium', color: '#f4a261' },
  { value: 'high', color: '#f25f5c' },
];

const TaskContextMenu: React.FC<TaskContextMenuProps> = ({ x, y, isOpen, onClose, taskId }) => {
  const { tasks, updateTask, deleteTask } = useTaskContext();
  
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  if (!isOpen || !task) return null;

  const handleUpdatePomodoro = (delta: number) => {
    const newVal = Math.max(0, task.pomodoroEstimate + delta);
    updateTask(task.id, { pomodoroEstimate: newVal });
  };

  const handleSetPriority = (priority: Priority) => {
    updateTask(task.id, { priority });
    onClose();
  };

  const setDueDate = (days: number | null) => {
    if (days === null) {
      updateTask(task.id, { dueDate: null });
    } else {
      const date = new Date();
      date.setDate(date.getDate() + days);
      updateTask(task.id, { dueDate: date.toISOString() });
    }
    onClose();
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  return (
    <ContextMenu x={x} y={y} isOpen={isOpen} onClose={onClose}>
      {/* Estimated Pomodoros */}
      <div className="tc-menu-section">
        <div className="tc-menu-label">Estimated Pomodoros</div>
        <div className="tc-pomo-control">
          <button className="tc-pomo-btn" onClick={() => handleUpdatePomodoro(-1)}>−</button>
          <div className="tc-pomo-value">
            <IconPomodoro width="14" height="14" />
            <span>{task.pomodoroEstimate}</span>
          </div>
          <button className="tc-pomo-btn" onClick={() => handleUpdatePomodoro(1)}>+</button>
        </div>
      </div>

      <div className="tc-divider" />

      {/* Due Date */}
      <button className="tc-menu-item" onClick={() => setDueDate(0)}>Due Today</button>
      <button className="tc-menu-item" onClick={() => setDueDate(1)}>Due Tomorrow</button>
      <button className="tc-menu-item" onClick={() => setDueDate(7)}>Due next week</button>
      <button className="tc-menu-item tc-has-submenu">
        Set due date <span className="tc-arrow">▶</span>
      </button>
      <button className="tc-menu-item" onClick={() => setDueDate(null)}>Someday</button>

      <div className="tc-divider" />

      {/* Priority */}
      <div className="tc-menu-section">
        <div className="tc-menu-label">Priority</div>
        <div className="tc-priority-row">
          {PRIORITY_OPTIONS.map((opt) => (
            <button 
              key={opt.value} 
              className={`tc-priority-btn ${task.priority === opt.value ? 'active' : ''}`}
              onClick={() => handleSetPriority(opt.value)}
            >
              <IconFlag color={opt.color} />
            </button>
          ))}
        </div>
      </div>

      <div className="tc-divider" />

      {/* Move to Project & Tags */}
      <button className="tc-menu-item tc-has-submenu">
        Move to Project <span className="tc-arrow">▶</span>
      </button>
      <button className="tc-menu-item tc-has-submenu">
        Tags <span className="tc-arrow">▶</span>
      </button>

      <div className="tc-divider" />

      {/* Delete */}
      <button className="tc-menu-item" onClick={handleDelete}>Delete Task</button>

      <style>{`
        .tc-menu-section {
          padding: 4px 16px;
        }
        .tc-menu-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          margin-bottom: 8px;
        }
        .tc-pomo-control {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 4px;
        }
        .tc-pomo-btn {
          background: var(--bg-card-hover);
          border: none;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .tc-pomo-btn:hover {
          background: var(--border);
          color: var(--text-primary);
        }
        .tc-pomo-value {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }
        .tc-divider {
          height: 1px;
          background: var(--border);
          margin: 6px 0;
        }
        .tc-menu-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 8px 16px;
          background: transparent;
          border: none;
          text-align: left;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: var(--text-sm);
        }
        .tc-menu-item:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .tc-has-submenu {
          justify-content: space-between;
        }
        .tc-arrow {
          font-size: 8px;
          color: var(--text-tertiary);
        }
        .tc-priority-row {
          display: flex;
          gap: 8px;
        }
        .tc-priority-btn {
          background: var(--bg-card);
          border: 1px solid transparent;
          border-radius: 4px;
          padding: 6px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tc-priority-btn:hover {
          background: var(--bg-card-hover);
        }
        .tc-priority-btn.active {
          background: var(--bg-card-hover);
          border-color: var(--border-strong);
        }
      `}</style>
    </ContextMenu>
  );
};

export default TaskContextMenu;
