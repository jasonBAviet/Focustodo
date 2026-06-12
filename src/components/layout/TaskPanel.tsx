import React, { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import TaskDetail from '../task/TaskDetail';
import TagPicker from '../task/TagPicker';
import DatePicker from '../common/DatePicker';
import PomodoroScrollPicker from '../common/PomodoroScrollPicker';
import { getVisibleTags } from '../../utils/tagScope';
import { dateUtils } from '../../utils/dateUtils';
import type { Priority } from '../../types';

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high',   label: 'Cao',        color: '#f25f5c' },
  { value: 'medium', label: 'Trung bình', color: '#f4a261' },
  { value: 'low',    label: 'Thấp',       color: '#2ec4b6' },
  { value: 'none',   label: 'Không',      color: '#888' },
];

const TaskPanel: React.FC = () => {
  const {
    tasks, selectedTaskId, setSelectedTaskId,
    updateTask, completeTask, restoreTask, deleteTask,
    addTask, tags, addTag, projects, folders,
    activeView, activeProjectId,
  } = useTaskContext();

  const [panelWidth, setPanelWidth] = useState(280);
  const resizeRef = useRef(false);

  // Existing task editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState<Priority>('none');
  const [newPomodoro, setNewPomodoro] = useState(1);
  const [newDueDate, setNewDueDate] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showPomoPicker, setShowPomoPicker] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const newTitleRef = useRef<HTMLInputElement>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // When entering "new task" mode, reset form and set default project
  useEffect(() => {
    if (!selectedTaskId) {
      setNewProjectId(activeView === 'project' && activeProjectId ? activeProjectId : null);
      setNewTags([]);
      setNewPriority('none');
      setNewPomodoro(1);
      setNewDueDate(null);
      setNewNote('');
      setNewTitle('');
      setShowDueDatePicker(false);
      setShowPomoPicker(false);
      setShowPriorityMenu(false);
      setTimeout(() => newTitleRef.current?.focus(), 60);
    }
  }, [selectedTaskId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setEditingTitle(false); }, [selectedTaskId]);

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

  // ---- New task submit ----
  const handleNewTaskSubmit = () => {
    if (!newTitle.trim()) return;
    const created = addTask(newTitle.trim(), newProjectId, newPriority, newPomodoro);
    const extras: Record<string, unknown> = {};
    if (newTags.length) extras.tags = newTags;
    if (newDueDate) extras.dueDate = newDueDate;
    if (newNote.trim()) extras.note = newNote.trim();
    if (Object.keys(extras).length) updateTask(created.id, extras);
    setSelectedTaskId(created.id);
  };

  const dueDateText = newDueDate
    ? dateUtils.isToday(newDueDate) ? 'Today'
      : dateUtils.isTomorrow(newDueDate) ? 'Tomorrow'
      : dateUtils.formatShort(newDueDate)
    : 'None';

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === newPriority);

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
        /* ======== NEW TASK MODE ======== */
        <>
          <div className="task-panel-header">
            <span className="panel-new-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <h2 className="task-panel-title" style={{ color: 'var(--text-secondary)', fontWeight: 500, cursor: 'default' }}>
              Task mới
            </h2>
          </div>

          {/* Title input */}
          <div className="new-task-title-wrap">
            <input
              ref={newTitleRef}
              className="new-task-title-input"
              placeholder="Tên task..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !(e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) {
                  e.preventDefault();
                  handleNewTaskSubmit();
                }
              }}
            />
          </div>

          {/* Tags */}
          <div className="task-panel-tags">
            <TagPicker
              taskTags={newTags}
              allTags={getVisibleTags(tags, folders, projects, { projectId: newProjectId })}
              onUpdate={setNewTags}
              onAddTag={(name, color) => addTag(name, color, { projectId: newProjectId ?? null })}
            />
          </div>

          {/* Form rows */}
          <div className="task-panel-body">

            {/* Project */}
            <div className="tp-row">
              <span className="tp-row__icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2h10l-2 4 2 4H2l2-4-2-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="tp-row__label">Dự án</span>
              <span className="tp-row__value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {newProjectId && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: projects.find((p) => p.id === newProjectId)?.color || '#888',
                  }} />
                )}
                <select
                  className="tp-select"
                  value={newProjectId || ''}
                  onChange={(e) => setNewProjectId(e.target.value || null)}
                >
                  <option value="">Không có</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </span>
            </div>

            {/* Priority */}
            <div className="tp-row" style={{ position: 'relative' }}>
              <span className="tp-row__icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ color: currentPriority?.color }}>
                  <path d="M2 2h10l-2 4 2 4H2l2-4-2-4z"/>
                </svg>
              </span>
              <span className="tp-row__label">Ưu tiên</span>
              <span className="tp-row__value">
                <button
                  className="tp-inline-btn"
                  style={{ color: currentPriority?.color }}
                  onClick={() => { setShowPriorityMenu((v) => !v); setShowDueDatePicker(false); }}
                >
                  {currentPriority?.label}
                </button>
                {showPriorityMenu && (
                  <div className="tp-popover">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`tp-popover-item${newPriority === opt.value ? ' active' : ''}`}
                        onClick={() => { setNewPriority(opt.value); setShowPriorityMenu(false); }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </span>
            </div>

            {/* Pomodoro */}
            <div className="tp-row">
              <span className="tp-row__icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="tp-row__label">Pomodoro</span>
              <span className="tp-row__value">
                <button
                  className="pomo-trigger"
                  onClick={() => { setShowPomoPicker(true); setShowDueDatePicker(false); setShowPriorityMenu(false); }}
                >
                  <span className="pomo-trigger__count">{newPomodoro}</span>
                  <span className="pomo-trigger__meta">{newPomodoro * 25}m</span>
                </button>
              </span>
            </div>
            {showPomoPicker && (
              <PomodoroScrollPicker
                estimate={newPomodoro}
                pomoDuration={25}
                onEstimateChange={(e) => setNewPomodoro(e)}
                onClose={() => setShowPomoPicker(false)}
              />
            )}

            {/* Due date */}
            <div className="tp-row" style={{ position: 'relative' }}>
              <span className="tp-row__icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 2v2M9 2v2M2 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="tp-row__label">Hạn</span>
              <span className="tp-row__value">
                <button
                  className="tp-inline-btn"
                  style={{ color: newDueDate ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                  onClick={() => { setShowDueDatePicker((v) => !v); setShowPriorityMenu(false); }}
                >
                  {dueDateText}
                </button>
                {showDueDatePicker && (
                  <div className="tp-popover tp-popover--date">
                    <DatePicker
                      value={newDueDate}
                      onChange={(d) => { setNewDueDate(d); setShowDueDatePicker(false); }}
                      onRemove={() => { setNewDueDate(null); setShowDueDatePicker(false); }}
                      onClose={() => setShowDueDatePicker(false)}
                    />
                  </div>
                )}
              </span>
            </div>

            {/* Note */}
            <div className="tp-note-section">
              <textarea
                className="tp-note"
                placeholder="Ghi chú..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="task-panel-footer">
            <span className="panel-created-at">Enter để lưu</span>
            <button
              className="panel-add-btn"
              onClick={handleNewTaskSubmit}
              disabled={!newTitle.trim()}
            >
              Thêm task
            </button>
          </div>
        </>
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
          border-radius: 4px; padding: 2px 4px; margin: -2px -4px;
          transition: background var(--transition-fast);
        }
        .task-panel-title:hover { background: var(--glass-bg-hover); }
        .task-panel-title-input {
          flex: 1; font-size: var(--text-md); font-weight: 600;
          color: var(--text-primary); line-height: 1.4; font-family: var(--font-main);
          background: var(--bg-input); border: 1px solid var(--accent);
          border-radius: 4px; padding: 2px 6px; outline: none;
        }
        .task-panel-header-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .panel-created-at { font-size: var(--text-xs); color: var(--text-tertiary); }
        .panel-footer-actions { display: flex; gap: 4px; }
        .panel-add-btn {
          font-size: var(--text-xs); font-weight: 600; color: var(--accent);
          background: none; border: 1px solid var(--accent); border-radius: 4px;
          padding: 4px 10px; cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .panel-add-btn:hover:not(:disabled) { background: var(--accent); color: #fff; }
        .panel-add-btn:disabled { opacity: 0.35; cursor: default; }
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

        /* ---- New task form rows ---- */
        .new-task-title-wrap {
          padding: 8px var(--panel-padding, 16px) 10px;
          border-bottom: 1px solid var(--divider);
        }
        .new-task-title-input {
          width: 100%; box-sizing: border-box;
          background: var(--bg-input); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 8px 12px;
          color: var(--text-primary); font-size: var(--text-md); font-weight: 500;
          font-family: var(--font-main); outline: none;
          transition: border-color var(--transition-fast);
        }
        .new-task-title-input:focus { border-color: var(--accent); }
        .new-task-title-input::placeholder { color: var(--text-tertiary); }
        .tp-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 0; border-bottom: 1px solid var(--divider);
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
          cursor: pointer; border-radius: 4px; font-size: var(--text-sm);
          color: var(--text-secondary); font-family: var(--font-main);
          transition: background var(--transition-fast);
        }
        .tp-popover-item:hover, .tp-popover-item.active {
          background: var(--glass-bg-hover); color: var(--text-primary);
        }
        .pomo-trigger {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none; cursor: pointer;
          padding: 2px 4px; border-radius: 6px;
          transition: background var(--transition-fast);
        }
        .pomo-trigger:hover { background: var(--bg-card-hover); }
        .pomo-trigger__count {
          font-weight: 600; font-size: 15px; color: var(--text-primary);
          min-width: 18px; text-align: center; font-family: var(--font-main);
        }
        .pomo-trigger__meta { font-size: var(--text-xs); color: var(--text-tertiary); }
        .tp-note-section { padding: 12px 0; }
        .tp-note {
          width: 100%; box-sizing: border-box;
          background: var(--bg-input); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 10px 12px;
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
