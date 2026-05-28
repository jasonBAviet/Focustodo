import React, { useState, useRef } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { IconPomodoro } from '../common/IconPomodoro';
import type { Priority } from '../../types';

interface TaskAddBarProps {
  placeholder?: string;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'Cao', color: '#f25f5c' },
  { value: 'medium', label: 'Trung binh', color: '#f4a261' },
  { value: 'low', label: 'Thap', color: '#2ec4b6' },
  { value: 'none', label: 'Khong', color: '#888' },
];

const TaskAddBar: React.FC<TaskAddBarProps> = ({ placeholder }) => {
  const { addTask, activeView, activeProjectId, projects } = useTaskContext();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [pomodoroEstimate, setPomodoroEstimate] = useState(1);
  const [showPomoMenu, setShowPomoMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getProjectFromView = (): string | null => {
    if (activeView === 'project' && activeProjectId) return activeProjectId;
    return null;
  };

  const getPlaceholder = (): string => {
    if (placeholder) return placeholder;
    if (activeView === 'project' && activeProjectId) {
      const p = projects.find((pr) => pr.id === activeProjectId);
      return `Them task vao "${p?.name || 'Project'}", nhan [Enter] de luu`;
    }
    return 'Them task, nhan [Enter] de luu';
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    addTask(title.trim(), getProjectFromView(), priority, pomodoroEstimate);
    setTitle('');
    setPriority('none');
    setPomodoroEstimate(1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      setTitle('');
      inputRef.current?.blur();
    }
  };

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

  return (
    <div className="task-add-bar">
      <div className="task-add-bar__icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <input
        ref={inputRef}
        className="task-add-bar__input"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
      />
      <div className="task-add-bar__actions">
        {/* Pomodoro estimate picker */}
        <div className="task-add-bar__action-wrap">
          <button
            className="task-add-bar__action-btn"
            title="So pomodoro"
            onClick={() => setShowPomoMenu((v) => !v)}
            style={{ color: pomodoroEstimate > 1 ? 'var(--accent)' : 'var(--text-tertiary)' }}
          >
            <IconPomodoro width="14" height="14" />
            {pomodoroEstimate > 1 && (
              <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 600 }}>{pomodoroEstimate}</span>
            )}
          </button>
          {showPomoMenu && (
            <div className="task-add-bar__menu">
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`task-add-bar__menu-item ${pomodoroEstimate === n ? 'active' : ''}`}
                  onClick={() => { setPomodoroEstimate(n); setShowPomoMenu(false); }}
                >
                  <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {Array.from({ length: n }).map((_, j) => (
                      <span key={j} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: pomodoroEstimate === n ? 'var(--accent)' : 'var(--text-tertiary)',
                        display: 'inline-block',
                      }} />
                    ))}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {n * 25}m
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority picker */}
        <div className="task-add-bar__action-wrap">
          <button
            className="task-add-bar__action-btn"
            title="Do uu tien"
            onClick={() => setShowPriorityMenu((v) => !v)}
            style={{ color: currentPriority?.color }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M2 2h10l-2 4 2 4H2l2-4-2-4z"/>
            </svg>
          </button>
          {showPriorityMenu && (
            <div className="task-add-bar__menu">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`task-add-bar__menu-item ${priority === opt.value ? 'active' : ''}`}
                  onClick={() => { setPriority(opt.value); setShowPriorityMenu(false); }}
                  style={{ '--item-color': opt.color } as React.CSSProperties}
                >
                  <span className="task-add-bar__menu-dot" style={{ background: opt.color }} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .task-add-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border: 1px dashed var(--border-strong);
          border-radius: var(--radius-md);
          background: var(--task-bg);
          transition: border-color var(--transition-fast), background var(--transition-fast);
          position: relative;
        }
        .task-add-bar:focus-within {
          border-color: var(--accent);
          border-style: solid;
          background: var(--task-bg-hover);
        }
        .task-add-bar__icon { color: var(--text-tertiary); flex-shrink: 0; }
        .task-add-bar__input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: var(--text-base);
          font-family: var(--font-main);
        }
        .task-add-bar__input::placeholder { color: var(--text-tertiary); }
        .task-add-bar__actions { display: flex; gap: 4px; align-items: center; }
        .task-add-bar__action-wrap { position: relative; }
        .task-add-bar__action-btn {
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); padding: 4px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .task-add-bar__action-btn:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .task-add-bar__menu {
          position: absolute; right: 0; top: calc(100% + 4px);
          background: var(--bg-dialog); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 4px;
          min-width: 130px; z-index: 100;
          box-shadow: var(--shadow-lg);
          animation: slide-in-down 150ms ease both;
        }
        .task-add-bar__menu-item {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 6px 8px; border: none; background: none;
          cursor: pointer; border-radius: 4px; font-size: var(--text-sm);
          color: var(--text-secondary);
          transition: background var(--transition-fast);
        }
        .task-add-bar__menu-item:hover, .task-add-bar__menu-item.active {
          background: var(--glass-bg-hover); color: var(--text-primary);
        }
        .task-add-bar__menu-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default TaskAddBar;
