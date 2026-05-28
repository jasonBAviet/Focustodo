import React, { useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import type { Task } from '../../types';

interface SubtaskListProps {
  task: Task;
}

const SubtaskList: React.FC<SubtaskListProps> = ({ task }) => {
  const { addSubtask, toggleSubtask, deleteSubtask } = useTaskContext();
  const [newSubtask, setNewSubtask] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    if (!newSubtask.trim()) return;
    addSubtask(task.id, newSubtask.trim());
    setNewSubtask('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setNewSubtask(''); setShowInput(false); }
  };

  return (
    <div className="subtask-section">
      {/* Subtask items */}
      {task.subtasks.map((sub) => (
        <div key={sub.id} className="subtask-item">
          <button
            className={`subtask-check ${sub.completed ? 'checked' : ''}`}
            onClick={() => toggleSubtask(task.id, sub.id)}
          >
            {sub.completed && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <span className={`subtask-title ${sub.completed ? 'done' : ''}`}>
            {sub.title}
          </span>
          <button
            className="subtask-delete"
            onClick={() => deleteSubtask(task.id, sub.id)}
            title="Xoa subtask"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}

      {/* Add subtask */}
      {showInput ? (
        <div className="subtask-add-row">
          <span className="subtask-add-icon">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M4 1v6M1 4h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            autoFocus
            className="subtask-input"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (!newSubtask.trim()) setShowInput(false); }}
            placeholder="Ten subtask, nhan Enter de luu"
          />
        </div>
      ) : (
        <button
          className="subtask-add-btn"
          onClick={() => setShowInput(true)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Them subtask
        </button>
      )}

      <style>{`
        .subtask-section { padding: 8px 0; border-bottom: 1px solid var(--divider); }
        .subtask-item {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 0;
        }
        .subtask-item:hover .subtask-delete { opacity: 1; }
        .subtask-check {
          width: 14px; height: 14px; border-radius: 3px;
          border: 1.5px solid var(--border-strong);
          background: none; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all var(--transition-fast);
        }
        .subtask-check:hover { border-color: var(--accent); }
        .subtask-check.checked { background: var(--accent); border-color: var(--accent); }
        .subtask-title {
          flex: 1; font-size: var(--text-sm); color: var(--text-primary);
        }
        .subtask-title.done {
          color: var(--text-tertiary); text-decoration: line-through;
        }
        .subtask-delete {
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast);
          padding: 2px; border-radius: 3px; display: flex;
        }
        .subtask-delete:hover { color: var(--priority-high); }
        .subtask-add-row {
          display: flex; align-items: center; gap: 8px; padding: 5px 0;
        }
        .subtask-add-icon { color: var(--text-tertiary); flex-shrink: 0; }
        .subtask-input {
          flex: 1; background: none; border: none; outline: none;
          border-bottom: 1px solid var(--accent);
          color: var(--text-primary); font-size: var(--text-sm);
          font-family: var(--font-main); padding: 2px 0;
        }
        .subtask-input::placeholder { color: var(--text-tertiary); }
        .subtask-add-btn {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); font-size: var(--text-sm);
          font-family: var(--font-main); padding: 6px 0;
          transition: color var(--transition-fast);
        }
        .subtask-add-btn:hover { color: var(--accent); }
      `}</style>
    </div>
  );
};

export default SubtaskList;
