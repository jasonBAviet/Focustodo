import React, { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import TaskDetail from '../task/TaskDetail';
import TagPicker from '../task/TagPicker';
import { getVisibleTags } from '../../utils/tagScope';

const TaskPanel: React.FC = () => {
  const { tasks, selectedTaskId, setSelectedTaskId, updateTask, completeTask, restoreTask, deleteTask, tags, addTag, projects, folders } = useTaskContext();
  const [panelWidth, setPanelWidth] = useState(280);
  const resizeRef = useRef(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Đổi task -> thoát chế độ sửa tiêu đề.
  useEffect(() => { setEditingTitle(false); }, [selectedTaskId]);

  const startEditTitle = () => {
    if (!selectedTask) return;
    setTitleDraft(selectedTask.title);
    setEditingTitle(true);
  };
  const commitTitle = () => {
    if (selectedTask) {
      const next = titleDraft.trim();
      if (next && next !== selectedTask.title) updateTask(selectedTask.id, { title: next });
    }
    setEditingTitle(false);
  };

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

  useEffect(() => {
    document.documentElement.style.setProperty('--panel-width', `${panelWidth}px`);
  }, [panelWidth]);

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;
    resizeRef.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const newWidth = startWidth - (e.clientX - startX);
      const clamped = Math.max(240, Math.min(520, newWidth));
      setPanelWidth(clamped);
    };

    const handleMouseUp = () => {
      resizeRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!selectedTask) return null;

  return (
    <aside className="task-panel animate-slide-right">
      <div className="panel-resize-handle" onMouseDown={handleResizeStart} />
      {/* Header */}
      <div className="task-panel-header">
        <div className="task-panel-check-wrap">
          <button
            className={`panel-check ${selectedTask.completed ? 'checked' : ''}`}
            onClick={handleCompleteToggle}
            title={selectedTask.completed ? 'Restore' : 'Complete'}
          >
            {selectedTask.completed && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>

        {editingTitle ? (
          <input
            className="task-panel-title-input"
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !(e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) {
                e.preventDefault();
                commitTitle();
              } else if (e.key === 'Escape') {
                setEditingTitle(false);
              }
            }}
            onBlur={commitTitle}
          />
        ) : (
          <h2
            className="task-panel-title"
            onClick={startEditTitle}
            title="Bấm để đổi tên task"
            style={{ cursor: 'text' }}
          >
            {selectedTask.title}
          </h2>
        )}

        <div className="task-panel-header-actions">
          <button
            className="icon-btn"
            onClick={handleFlag}
            title="Flag"
            style={{ color: selectedTask.flagged ? 'var(--accent)' : 'var(--text-tertiary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill={selectedTask.flagged ? 'currentColor' : 'none'}>
              <path d="M3 2v10M3 2h8l-2 4 2 4H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={handleClose} title="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tags - ngay duoi tieu de */}
      <div className="task-panel-tags">
        <TagPicker
          taskTags={selectedTask.tags || []}
          allTags={getVisibleTags(tags, folders, projects, { projectId: selectedTask.projectId })}
          onUpdate={(tagIds) => updateTask(selectedTask.id, { tags: tagIds })}
          onAddTag={(name, color) => addTag(name, color, { projectId: selectedTask.projectId ?? null })}
        />
      </div>

      {/* Body */}
      <div className="task-panel-body">
        <TaskDetail task={selectedTask} />
      </div>

      {/* Footer */}
      <div className="task-panel-footer">
        <span className="panel-created-at">
          Created {new Date(selectedTask.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        </span>
        <div className="panel-footer-actions">
          <button
            className="icon-btn"
            title="Delete task"
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
        .panel-resize-handle {
          position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
          cursor: col-resize; z-index: 10;
          transition: background 150ms;
        }
        .panel-resize-handle:hover { background: var(--accent); opacity: 0.5; }
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
          border-radius: 4px;
          padding: 2px 4px;
          margin: -2px -4px;
          transition: background var(--transition-fast);
        }
        .task-panel-title:hover { background: var(--glass-bg-hover); }
        .task-panel-title-input {
          flex: 1;
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          font-family: var(--font-main);
          background: var(--bg-input);
          border: 1px solid var(--accent);
          border-radius: 4px;
          padding: 2px 6px;
          outline: none;
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
        .task-panel-tags {
          padding: 0 var(--panel-padding, 16px);
          border-bottom: 1px solid var(--divider);
        }
      `}</style>
    </aside>
  );
};

export default TaskPanel;
