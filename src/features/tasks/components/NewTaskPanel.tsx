import React, { useState, useEffect, useRef } from 'react';
import type { Priority, Project, Folder, Tag } from '@/types';
import { getVisibleTags } from '@/utils/tagScope';
import { dateUtils } from '@/utils/dateUtils';
import TagPicker from '@/features/tasks/components/TagPicker';
import DatePicker from '@/shared/components/DatePicker';
import PomodoroScrollPicker from '@/shared/components/PomodoroScrollPicker';

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high',   label: 'Cao',        color: 'var(--priority-high)' },
  { value: 'medium', label: 'Trung bình', color: 'var(--priority-medium)' },
  { value: 'low',    label: 'Thấp',       color: 'var(--priority-low)' },
  { value: 'none',   label: 'Không',      color: '#888' },
];

interface NewTaskPanelProps {
  activeView: string;
  activeProjectId: string | null;
  projects: Project[];
  folders: Folder[];
  tags: Tag[];
  addTag: (name: string, color: string, opts: { projectId: string | null }) => Tag;
  onAdd: (
    title: string,
    projectId: string | null,
    priority: Priority,
    pomodoro: number,
    extras: { tags?: string[]; dueDate?: string; note?: string }
  ) => void;
}

const NewTaskPanel: React.FC<NewTaskPanelProps> = ({
  activeView, activeProjectId, projects, folders, tags, addTag, onAdd
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState<string | null>(activeView === 'project' && activeProjectId ? activeProjectId : null);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState<Priority>('none');
  const [newPomodoro, setNewPomodoro] = useState(1);
  const [newDueDate, setNewDueDate] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showPomoPicker, setShowPomoPicker] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const newTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => newTitleRef.current?.focus(), 60);
  }, []);

  const handleNewTaskSubmit = () => {
    if (!newTitle.trim()) return;
    const extras: { tags?: string[]; dueDate?: string; note?: string } = {};
    if (newTags.length) extras.tags = newTags;
    if (newDueDate) extras.dueDate = newDueDate;
    if (newNote.trim()) extras.note = newNote.trim();
    onAdd(newTitle.trim(), newProjectId, newPriority, newPomodoro, extras);
  };

  const dueDateText = newDueDate
    ? dateUtils.isToday(newDueDate) ? 'Today'
      : dateUtils.isTomorrow(newDueDate) ? 'Tomorrow'
      : dateUtils.formatShort(newDueDate)
    : 'None';

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === newPriority);

  return (
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

      <div className="task-panel-tags">
        <TagPicker
          taskTags={newTags}
          allTags={getVisibleTags(tags, folders, projects, { projectId: newProjectId })}
          onUpdate={setNewTags}
          onAddTag={(name, color) => addTag(name, color, { projectId: newProjectId ?? null })}
        />
      </div>

      <div className="task-panel-body">
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
  );
};

export default NewTaskPanel;
