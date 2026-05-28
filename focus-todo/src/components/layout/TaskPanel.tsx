import React from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import TaskDetail from '../task/TaskDetail';

const TaskPanel: React.FC = () => {
  const { tasks, selectedTaskId, setSelectedTaskId, updateTask, completeTask, restoreTask, deleteTask } = useTaskContext();

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  const handleClose = () => setSelectedTaskId(null);

  const handleFlag = () => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, { flagged: !selectedTask.flagged });
  };

  const handleCompleteToggle = () => {
    if (!selectedTask) return;
    if (selectedTask.completed) {
      restoreTask(selectedTask.id);
    } else {
      completeTask(selectedTask.id);
    }
  };

  const handleDelete = () => {
    if (!selectedTask) return;
    const id = selectedTask.id;
    handleClose();
    deleteTask(id);
  };

  if (!selectedTask) return null;

  return (
    <aside className="task-panel animate-slide-right">
      {/* Header */}
      <div className="task-panel-header">
        <div className="task-panel-check-wrap">
          <button
            className={`panel-check ${selectedTask.completed ? 'checked' : ''}`}
            onClick={handleCompleteToggle}
            title={selectedTask.completed ? 'Khoi phuc' : 'Hoan thanh'}
          >
            {selectedTask.completed && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>

        <h2 className="task-panel-title">{selectedTask.title}</h2>

        <div className="task-panel-header-actions">
          <button
            className="icon-btn"
            onClick={handleFlag}
            title="Danh dau"
            style={{ color: selectedTask.flagged ? 'var(--accent)' : 'var(--text-tertiary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill={selectedTask.flagged ? 'currentColor' : 'none'}>
              <path d="M3 2v10M3 2h8l-2 4 2 4H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={handleClose} title="Dong">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="task-panel-body">
        <TaskDetail task={selectedTask} />
      </div>

      {/* Footer */}
      <div className="task-panel-footer">
        <span className="panel-created-at">
          Created on {new Date(selectedTask.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        </span>
        <div className="panel-footer-actions">
          <button
            className="icon-btn"
            title="Xoa task"
            onClick={handleDelete}
            style={{ color: 'var(--text-tertiary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V3h4v1M6 7v3M8 7v3M3 4l.8 7.5h6.4L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .task-panel-check-wrap { flex-shrink: 0; }
        .panel-check {
          width: 20px; height: 20px; border-radius: 50%;
          border: 1.5px solid var(--border-strong);
          background: none; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all var(--transition-fast);
        }
        .panel-check:hover { border-color: var(--accent); }
        .panel-check.checked { background: var(--accent); border-color: var(--accent); }
        .task-panel-title {
          flex: 1;
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          word-break: break-word;
        }
        .task-panel-header-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .panel-created-at { font-size: var(--text-xs); color: var(--text-tertiary); }
        .panel-footer-actions { display: flex; gap: 4px; }
        .icon-btn {
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); padding: 4px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          transition: color var(--transition-fast), background var(--transition-fast);
        }
        .icon-btn:hover { color: var(--text-primary); background: var(--glass-bg-hover); }
      `}</style>
    </aside>
  );
};

export default TaskPanel;
