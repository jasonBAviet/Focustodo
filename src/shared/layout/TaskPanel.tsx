import React, { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import TaskDetail from '@/features/tasks/components/TaskDetail';
import TagPicker from '@/features/tasks/components/TagPicker';
import type { Priority } from '@/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import NewTaskPanel from '@/features/tasks/components/NewTaskPanel';
import { getVisibleTags } from '@/utils/tagScope';

const TaskPanel: React.FC = () => {
  const {
    tasks, selectedTaskId, setSelectedTaskId,
    updateTask, completeTask, restoreTask, deleteTask,
    addTask, tags, addTag, projects, folders,
    activeView, activeProjectId,
  } = useTaskContext();

  const [panelWidth, setPanelWidth] = useState(280);
  const [hasResized, setHasResized] = useState(false);
  const resizeRef = useRef(false);
  const isMobile = useIsMobile();

  // Existing task editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  useEffect(() => { setEditingTitle(false); }, [selectedTaskId]);

  useEffect(() => {
    if (hasResized) {
      document.documentElement.style.setProperty('--panel-width', `${panelWidth}px`);
    }
  }, [panelWidth, hasResized]);

  if (isMobile && !selectedTaskId) {
    return null;
  }

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const panelEl = e.currentTarget.parentElement;
    const startWidth = panelEl ? panelEl.getBoundingClientRect().width : panelWidth;
    resizeRef.current = true;
    setHasResized(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const newWidth = startWidth - (e.clientX - startX);
      setPanelWidth(Math.max(240, Math.min(520, newWidth)));
    };
    const handleMouseUp = () => {
      resizeRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ---- Existing task handlers ----
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
    if (selectedTask.completed) restoreTask(selectedTask.id);
    else completeTask(selectedTask.id);
  };
  const handleDelete = () => {
    if (!selectedTask) return;
    const id = selectedTask.id;
    handleClose();
    deleteTask(id);
  };

  const handleAddNewTask = (title: string, projectId: string | null, priority: Priority, pomodoro: number, extras: any) => {
    const created = addTask(title, projectId, priority, pomodoro);
    if (Object.keys(extras).length) updateTask(created.id, extras);
    setSelectedTaskId(created.id);
  };

  return (
    <aside className="task-panel animate-slide-right">
      <div className="panel-resize-handle" onMouseDown={handleResizeStart} />

      {selectedTask ? (
        /* ======== EXISTING TASK MODE ======== */
        <>
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
              <button className="icon-btn" onClick={handleClose} title="Đóng">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="task-panel-tags">
            <TagPicker
              taskTags={selectedTask.tags || []}
              allTags={getVisibleTags(tags, folders, projects, { projectId: selectedTask.projectId })}
              onUpdate={(tagIds) => updateTask(selectedTask.id, { tags: tagIds })}
              onAddTag={(name, color) => addTag(name, color, { projectId: selectedTask.projectId ?? null })}
            />
          </div>

          <div className="task-panel-body">
            <TaskDetail task={selectedTask} />
          </div>

          <div className="task-panel-footer">
            <span className="panel-created-at">
              Created {new Date(selectedTask.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
            <div className="panel-footer-actions">
              <button
                className="icon-btn"
                title="Xoá task"
                onClick={handleDelete}
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 4h10M5 4V3h4v1M6 7v3M8 7v3M3 4l.8 7.5h6.4L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
          <NewTaskPanel
            activeView={activeView}
            activeProjectId={activeProjectId}
            projects={projects}
            folders={folders}
            tags={tags}
            addTag={addTag}
            onAdd={handleAddNewTask}
          />
      )}

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
        .panel-new-icon {
          width: 20px; height: 20px; border-radius: 50%;
          border: 1.5px dashed var(--border-strong);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-tertiary); flex-shrink: 0;
        }
        .task-panel-title {
          flex: 1; font-size: var(--text-md); font-weight: 600;
          color: var(--text-primary); line-height: 1.4; word-break: break-word;
          border-radius: var(--radius-xs); padding: 2px 4px; margin: -2px -4px;
          transition: background var(--transition-fast);
        }
        .task-panel-title:hover { background: var(--glass-bg-hover); }
        .task-panel-title-input {
          flex: 1; font-size: var(--text-md); font-weight: 600;
          color: var(--text-primary); line-height: 1.4; font-family: var(--font-main);
          background: var(--bg-input); border: 1px solid var(--accent);
          border-radius: var(--radius-xs); padding: 2px 6px; outline: none;
        }
        .task-panel-header-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .panel-created-at { font-size: var(--text-xs); color: var(--text-tertiary); }
        .panel-footer-actions { display: flex; gap: 4px; }
        .panel-add-btn {
          font-size: var(--text-xs); font-weight: 600; color: var(--accent);
          background: none; border: 1px solid var(--accent); border-radius: var(--radius-xs);
          padding: var(--space-1) var(--space-2-5); cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .panel-add-btn:hover:not(:disabled) { background: var(--accent); color: #fff; }
        .panel-add-btn:disabled { opacity: 0.35; cursor: default; }
        .icon-btn {
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); padding: var(--space-1); border-radius: var(--radius-xs);
          display: flex; align-items: center; justify-content: center;
          transition: color var(--transition-fast), background var(--transition-fast);
        }
        .icon-btn:hover { color: var(--text-primary); background: var(--glass-bg-hover); }
        .task-panel-tags {
          padding: 0 var(--panel-padding);
          border-bottom: 1px solid var(--divider);
        }

        /* ---- New task form rows ---- */
        .new-task-title-wrap {
          padding: var(--space-2) var(--panel-padding) var(--space-2-5);
          border-bottom: 1px solid var(--divider);
        }
        .new-task-title-input {
          width: 100%; box-sizing: border-box;
          background: var(--bg-input); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: var(--space-2) var(--space-3);
          color: var(--text-primary); font-size: var(--text-md); font-weight: 500;
          font-family: var(--font-main); outline: none;
          transition: border-color var(--transition-fast);
        }
        .new-task-title-input:focus { border-color: var(--accent); }
        .new-task-title-input::placeholder { color: var(--text-tertiary); }
        .tp-row {
          display: flex; align-items: center; gap: var(--space-2-5);
          padding: var(--space-2-5) 0; border-bottom: 1px solid var(--divider);
          font-size: var(--text-sm); min-height: 40px;
          position: relative;
        }
        .tp-row__icon { color: var(--text-tertiary); flex-shrink: 0; width: 16px; }
        .tp-row__label { color: var(--text-secondary); flex: 1; }
        .tp-row__value { color: var(--text-primary); font-size: var(--text-sm); display: flex; align-items: center; }
        .tp-inline-btn {
          background: none; border: none; cursor: pointer;
          font-size: var(--text-sm); padding: 0; font-family: var(--font-main);
        }
        .tp-inline-btn:hover { text-decoration: underline; }
        .tp-select {
          background: none; border: none; outline: none;
          color: var(--text-primary); font-size: var(--text-sm);
          cursor: pointer; font-family: var(--font-main);
        }
        .tp-select option { background: var(--bg-dialog); }
        .tp-popover {
          position: absolute; right: 0; top: calc(100% + 4px);
          background: var(--bg-dialog); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 4px;
          min-width: 120px; z-index: 200;
          box-shadow: var(--shadow-lg);
          animation: slide-in-down 150ms ease both;
        }
        .tp-popover--date { min-width: unset; padding: 0; border-radius: var(--radius-lg); }
        .tp-popover-item {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 6px 8px; border: none; background: none;
          cursor: pointer; border-radius: var(--radius-xs); font-size: var(--text-sm);
          color: var(--text-secondary); font-family: var(--font-main);
          transition: background var(--transition-fast);
        }
        .tp-popover-item:hover, .tp-popover-item.active {
          background: var(--glass-bg-hover); color: var(--text-primary);
        }
        .pomo-trigger {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none; cursor: pointer;
          padding: 2px 4px; border-radius: var(--radius-sm);
          transition: background var(--transition-fast);
        }
        .pomo-trigger:hover { background: var(--bg-card-hover); }
        .pomo-trigger__count {
          font-weight: 600; font-size: var(--text-md); color: var(--text-primary);
          min-width: 18px; text-align: center; font-family: var(--font-main);
        }
        .pomo-trigger__meta { font-size: var(--text-xs); color: var(--text-tertiary); }
        .tp-note-section { padding: var(--space-3) 0; }
        .tp-note {
          width: 100%; box-sizing: border-box;
          background: var(--bg-input); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: var(--space-2-5) var(--space-3);
          color: var(--text-primary); font-size: var(--text-sm);
          font-family: var(--font-main); resize: vertical; outline: none;
          line-height: 1.6; transition: border-color var(--transition-fast);
        }
        .tp-note:focus { border-color: var(--accent); }
        .tp-note::placeholder { color: var(--text-tertiary); }
      `}</style>
    </aside>
  );
};

export default TaskPanel;
