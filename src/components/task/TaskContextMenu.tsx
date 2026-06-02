import React, { useMemo, useState, useEffect } from 'react';
import ContextMenu from '../common/ContextMenu';
import { useTaskContext } from '../../contexts/TaskContext';
import { IconPomodoro } from '../common/IconPomodoro';
import { toggleArrayItem } from '../../utils/arrayUtils';
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

type MenuState = 'main' | 'projects' | 'tags';

interface SubMenuShellProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

const SubMenuShell: React.FC<SubMenuShellProps> = ({ title, onBack, children }) => (
  <div className="tc-submenu-container">
    <div className="tc-menu-header">
      <button className="tc-back-btn" onClick={onBack}>
        ◀
      </button>
      <div className="tc-menu-title">{title}</div>
    </div>
    <div className="tc-divider" />
    <div className="tc-scrollable-list">{children}</div>
  </div>
);

const TaskContextMenu: React.FC<TaskContextMenuProps> = ({ x, y, isOpen, onClose, taskId }) => {
  const { tasks, projects, tags, updateTask, deleteTask, restoreTask } = useTaskContext();
  const [activeMenu, setActiveMenu] = useState<MenuState>('main');

  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  useEffect(() => {
    if (isOpen) {
      setActiveMenu('main');
    }
  }, [isOpen, taskId]);

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

  const handleAssignProject = (projectId: string | null) => {
    updateTask(task.id, { projectId });
    onClose();
  };

  const handleToggleTag = (tagId: string) => {
    const currentTags = task.tags || [];
    const newTags = toggleArrayItem(currentTags, tagId);
    updateTask(task.id, { tags: newTags });
  };

  const handleRestore = () => {
    restoreTask(task.id);
    onClose();
  };

  const menuContent: Record<MenuState, React.ReactNode> = {
    main: (
      <>
        {task.completed ? (
          <>
            <button className="tc-menu-item" style={{ color: '#4ade80' }} onClick={handleRestore}>Đánh dấu chưa hoàn thành</button>
            <button className="tc-menu-item" onClick={handleDelete}>Xóa Task</button>
          </>
        ) : (
          <>
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
            <button className="tc-menu-item tc-has-submenu" onClick={() => setActiveMenu('projects')}>
              Move to Project <span className="tc-arrow">▶</span>
            </button>
            <button className="tc-menu-item tc-has-submenu" onClick={() => setActiveMenu('tags')}>
              Tags <span className="tc-arrow">▶</span>
            </button>

            <div className="tc-divider" />

            {/* Delete */}
            <button className="tc-menu-item" onClick={handleDelete}>Delete Task</button>
          </>
        )}
      </>
    ),
    projects: (
      <SubMenuShell title="Select Project" onBack={() => setActiveMenu('main')}>
        <button
          className={`tc-menu-item ${task.projectId === null ? 'tc-item-selected' : ''}`}
          onClick={() => handleAssignProject(null)}
        >
          <span className="tc-item-color" style={{ background: '#7ec8e3' }} /> Inbox
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            className={`tc-menu-item ${task.projectId === p.id ? 'tc-item-selected' : ''}`}
            onClick={() => handleAssignProject(p.id)}
          >
            <span className="tc-item-color" style={{ background: p.color }} /> {p.name}
          </button>
        ))}
      </SubMenuShell>
    ),
    tags: (
      <SubMenuShell title="Select Tags" onBack={() => setActiveMenu('main')}>
        {tags.length === 0 ? (
          <div className="tc-menu-label" style={{ padding: '8px 16px', textAlign: 'center' }}>No tags available</div>
        ) : (
          tags.map((t) => {
            const isSelected = (task.tags || []).includes(t.id);
            return (
              <button
                key={t.id}
                className="tc-menu-item"
                onClick={() => handleToggleTag(t.id)}
              >
                <div className="tc-menu-item-content">
                  <div className="tc-menu-item-left">
                    <span className="tc-item-color" style={{ background: t.color }} />
                    {t.name}
                  </div>
                  {isSelected && <span className="tc-check-icon">✓</span>}
                </div>
              </button>
            );
          })
        )}
      </SubMenuShell>
    ),
  };

  return (
    <ContextMenu x={x} y={y} isOpen={isOpen} onClose={onClose}>
      {menuContent[activeMenu]}

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
        .tc-item-selected {
          background: var(--bg-card-hover);
          color: var(--primary);
          font-weight: 500;
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
        
        /* Submenu specific styles */
        .tc-submenu-container {
          display: flex;
          flex-direction: column;
          max-height: 280px;
        }
        .tc-menu-header {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          gap: 8px;
        }
        .tc-back-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-tertiary);
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
        }
        .tc-back-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .tc-menu-title {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
        }
        .tc-scrollable-list {
          overflow-y: auto;
          flex: 1;
        }
        .tc-item-color {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .tc-menu-item-content {
          display: flex;
          align-items: center;
          width: 100%;
          justify-content: space-between;
        }
        .tc-menu-item-left {
          display: flex;
          align-items: center;
        }
        .tc-check-icon {
          color: var(--primary);
          font-weight: bold;
        }
      `}</style>
    </ContextMenu>
  );
};

export default TaskContextMenu;

