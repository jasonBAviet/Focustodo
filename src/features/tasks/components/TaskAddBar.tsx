import React, { useRef } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';

interface TaskAddBarProps {
  placeholder?: string;
}

const TaskAddBar: React.FC<TaskAddBarProps> = ({ placeholder }) => {
  const {
    activeView, activeProjectId, activeTagId, projects, tags,
    setNewTaskPanelOpen, newTaskDraft, updateNewTaskDraft, submitNewTask, resetNewTaskDraft,
    setSelectedTaskId,
  } = useTaskContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const getPlaceholder = (): string => {
    if (placeholder) return placeholder;
    if (activeView === 'project' && activeProjectId) {
      const p = projects.find((pr) => pr.id === activeProjectId);
      return `Add task to "${p?.name || 'Project'}", press [Enter] to save`;
    }
    if (activeView === 'tag' && activeTagId) {
      const t = tags.find((tg) => tg.id === activeTagId);
      return `Add task with tag "${t?.name || 'Tag'}", press [Enter] to save`;
    }
    return 'Add task, press [Enter] to save';
  };

  const handleSubmit = () => {
    submitNewTask();
  };

  const handleFocus = () => {
    setSelectedTaskId(null);
    setNewTaskPanelOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      resetNewTaskDraft();
      setNewTaskPanelOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div
      className="task-add-bar"
      onClick={() => inputRef.current?.focus()}
      style={{ cursor: 'text' }}
    >
      <div className="task-add-bar__icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <input
        ref={inputRef}
        className="task-add-bar__input"
        type="text"
        value={newTaskDraft.title}
        onChange={(e) => updateNewTaskDraft({ title: e.target.value })}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={getPlaceholder()}
      />
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
      `}</style>
    </div>
  );
};

export default TaskAddBar;
