import React, { useState } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import TagPicker from '@/features/tasks/components/TagPicker';
import DatePicker from '@/shared/components/DatePicker';
import PomodoroScrollPicker from '@/shared/components/PomodoroScrollPicker';
import { getVisibleTags } from '@/utils/tagScope';
import { dateUtils } from '@/utils/dateUtils';
import type { Priority } from '@/types';

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high',   label: 'High',        color: 'var(--priority-high)' },
  { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
  { value: 'low',    label: 'Low',       color: 'var(--priority-low)' },
  { value: 'none',   label: 'None',      color: '#888' },
];

interface NewTaskPanelProps {
  onClose?: () => void;
}

const NewTaskPanel: React.FC<NewTaskPanelProps> = ({ onClose }) => {
  const {
    projects, folders, tags, addTag,
    newTaskDraft, updateNewTaskDraft, submitNewTask,
  } = useTaskContext();

  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showPomoPicker, setShowPomoPicker] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const handleSubmit = () => {
    submitNewTask();
  };

  const dueDateText = newTaskDraft.dueDate
    ? dateUtils.isToday(newTaskDraft.dueDate) ? 'Today'
      : dateUtils.isTomorrow(newTaskDraft.dueDate) ? 'Tomorrow'
      : dateUtils.formatShort(newTaskDraft.dueDate)
    : 'None';

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === newTaskDraft.priority);

  return (
    <>
      <div className="task-panel-header">
        <span className="panel-new-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
        <h2
          className="task-panel-title"
          style={{
            color: newTaskDraft.title ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: newTaskDraft.title ? 600 : 500,
            cursor: 'default',
          }}
        >
          {newTaskDraft.title || 'New Task'}
        </h2>
        {onClose && (
          <div className="task-panel-header-actions">
            <button className="icon-btn" onClick={onClose} title="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="task-panel-tags">
        <TagPicker
          taskTags={newTaskDraft.tags}
          allTags={getVisibleTags(tags, folders, projects, { projectId: newTaskDraft.projectId })}
          onUpdate={(tagIds) => updateNewTaskDraft({ tags: tagIds })}
          onAddTag={(name, color) => addTag(name, color, { projectId: newTaskDraft.projectId ?? null })}
        />
      </div>

      <div className="task-panel-body">
        {/* Project */}
        <div className="tp-row">
          <span className="tp-row__icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2h10l-2 4 2 4H2l2-4-2-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="tp-row__label">Project</span>
          <span className="tp-row__value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {newTaskDraft.projectId && (
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: projects.find((p) => p.id === newTaskDraft.projectId)?.color || '#888',
              }} />
            )}
            <select
              className="tp-select"
              value={newTaskDraft.projectId || ''}
              onChange={(e) => updateNewTaskDraft({ projectId: e.target.value || null })}
            >
              <option value="">None</option>
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
          <span className="tp-row__label">Priority</span>
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
                    className={`tp-popover-item${newTaskDraft.priority === opt.value ? ' active' : ''}`}
                    onClick={() => { updateNewTaskDraft({ priority: opt.value }); setShowPriorityMenu(false); }}
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
              <span className="pomo-trigger__count">{newTaskDraft.pomodoro}</span>
              <span className="pomo-trigger__meta">{newTaskDraft.pomodoro * 25}m</span>
            </button>
          </span>
        </div>
        {showPomoPicker && (
          <PomodoroScrollPicker
            estimate={newTaskDraft.pomodoro}
            pomoDuration={25}
            onEstimateChange={(e) => updateNewTaskDraft({ pomodoro: e })}
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
          <span className="tp-row__label">Due</span>
          <span className="tp-row__value">
            <button
              className="tp-inline-btn"
              style={{ color: newTaskDraft.dueDate ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
              onClick={() => { setShowDueDatePicker((v) => !v); setShowPriorityMenu(false); }}
            >
              {dueDateText}
            </button>
            {showDueDatePicker && (
              <div className="tp-popover tp-popover--date">
                <DatePicker
                  value={newTaskDraft.dueDate}
                  onChange={(d) => { updateNewTaskDraft({ dueDate: d }); setShowDueDatePicker(false); }}
                  onRemove={() => { updateNewTaskDraft({ dueDate: null }); setShowDueDatePicker(false); }}
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
            placeholder="Notes..."
            value={newTaskDraft.note}
            onChange={(e) => updateNewTaskDraft({ note: e.target.value })}
            rows={4}
          />
        </div>
      </div>

      <div className="task-panel-footer">
        <span className="panel-created-at">Enter to save</span>
        <button
          className="panel-add-btn"
          onClick={handleSubmit}
          disabled={!newTaskDraft.title.trim()}
        >
          Add task
        </button>
      </div>
    </>
  );
};

export default NewTaskPanel;
