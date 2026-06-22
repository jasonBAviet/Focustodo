import React, { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import type { Task, RepeatType, Priority } from '@/types';
import { dateUtils } from '@/utils/dateUtils';
import { describeRecurrence, toRecurrence } from '@/utils/recurrence';
import SubtaskList from '@/features/tasks/components/SubtaskList';
import DatePicker from '@/shared/components/DatePicker';
import RepeatEditor from '@/features/tasks/components/RepeatEditor';
import { DetailRow, PomodoroRow } from './TaskDetailHelpers';
import TaskAttachments from '@/features/tasks/components/TaskAttachments';
import TaskDiaries from '@/features/tasks/components/TaskDiaries';

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high',   label: 'High',        color: 'var(--priority-high)' },
  { value: 'medium', label: 'Medium',      color: 'var(--priority-medium)' },
  { value: 'low',    label: 'Low',         color: 'var(--priority-low)' },
  { value: 'none',   label: 'None',        color: '#888' },
];

interface TaskDetailProps {
  task: Task;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  const { updateTask, projects } = useTaskContext();
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'due' | 'completed' | null>(null);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [note, setNote] = useState(task.note);

  const startDateContainerRef = useRef<HTMLDivElement>(null);
  const dueDateContainerRef = useRef<HTMLDivElement>(null);
  const completedDateContainerRef = useRef<HTMLDivElement>(null);
  const reminderContainerRef = useRef<HTMLDivElement>(null);
  const repeatContainerRef = useRef<HTMLDivElement>(null);
  const priorityContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (activeDatePicker === 'start' && startDateContainerRef.current && !startDateContainerRef.current.contains(target)) {
        setActiveDatePicker(null);
      }
      if (activeDatePicker === 'due' && dueDateContainerRef.current && !dueDateContainerRef.current.contains(target)) {
        setActiveDatePicker(null);
      }
      if (activeDatePicker === 'completed' && completedDateContainerRef.current && !completedDateContainerRef.current.contains(target)) {
        setActiveDatePicker(null);
      }
      if (showReminderPicker && reminderContainerRef.current && !reminderContainerRef.current.contains(target)) {
        setShowReminderPicker(false);
      }
      if (showRepeatPicker && repeatContainerRef.current && !repeatContainerRef.current.contains(target)) {
        setShowRepeatPicker(false);
      }
      if (showPriorityPicker && priorityContainerRef.current && !priorityContainerRef.current.contains(target)) {
        setShowPriorityPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDatePicker, showReminderPicker, showRepeatPicker, showPriorityPicker]);

  useEffect(() => { setNote(task.note); }, [task.id]);

  const project = projects.find((p) => p.id === task.projectId);

  const handleNoteBlur = () => {
    if (note !== task.note) {
      updateTask(task.id, { note });
    }
  };

  const startDateText = task.startDate ? dateUtils.formatFullDateTime(task.startDate) : 'None';

  const startDateColor = task.startDate ? 'var(--text-primary)' : 'var(--text-tertiary)';

  const dueDateText = task.dueDate ? dateUtils.formatFullDateTime(task.dueDate) : 'None';

  const dueDateColor = task.dueDate && dateUtils.isOverdue(task.dueDate)
    ? 'var(--priority-high)'
    : task.dueDate
      ? 'var(--text-primary)'
      : 'var(--text-tertiary)';

  const completedDateText = task.completedAt ? dateUtils.formatFullDateTime(task.completedAt) : 'None';

  const completedDateColor = task.completedAt ? 'var(--text-primary)' : 'var(--text-tertiary)';

  return (
    <div className="task-detail">
      <PomodoroRow task={task} onUpdate={(e) => updateTask(task.id, { pomodoroEstimate: e })} />

      {/* Priority Row */}
      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ color: PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.color || '#888' }}>
          <path d="M2 2h10l-2 4 2 4H2l2-4-2-4z"/>
        </svg>}
        label="Priority"
      >
        <div ref={priorityContainerRef} style={{ position: 'relative' }}>
          <button
            className="detail-inline-btn"
            style={{ color: PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.color || '#888' }}
            onClick={() => { setShowPriorityPicker((v) => !v); setActiveDatePicker(null); setShowReminderPicker(false); setShowRepeatPicker(false); }}
          >
            {PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.label || 'None'}
          </button>
          {showPriorityPicker && (
            <div className="detail-date-popover" style={{ padding: 4, minWidth: 130 }}>
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`priority-option${task.priority === opt.value ? ' active' : ''}`}
                  onClick={() => { updateTask(task.id, { priority: opt.value }); setShowPriorityPicker(false); }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </DetailRow>

      {/* Start Date Row */}
      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M2 6h10M5 6v6M9 6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>}
        label="Start Date"
      >
        <div ref={startDateContainerRef} style={{ position: 'relative' }}>
          <button
            className="detail-inline-btn"
            style={{ color: startDateColor }}
            onClick={() => { setActiveDatePicker(activeDatePicker === 'start' ? null : 'start'); setShowReminderPicker(false); setShowRepeatPicker(false); setShowPriorityPicker(false); }}
          >
            {startDateText}
          </button>
          {activeDatePicker === 'start' && (
            <div className="detail-date-popover">
              <DatePicker
                isRange
                startDateValue={task.startDate}
                endDateValue={task.dueDate}
                onRangeChange={(start, end) => {
                  updateTask(task.id, { startDate: start, dueDate: end });
                }}
                onClose={() => setActiveDatePicker(null)}
              />
            </div>
          )}
        </div>
      </DetailRow>

      {/* Due Date Row */}
      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 2v2M9 2v2M2 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>}
        label="Due Date"
      >
        <div ref={dueDateContainerRef} style={{ position: 'relative' }}>
          <button
            className="detail-inline-btn"
            style={{ color: dueDateColor }}
            onClick={() => { setActiveDatePicker(activeDatePicker === 'due' ? null : 'due'); setShowReminderPicker(false); setShowRepeatPicker(false); setShowPriorityPicker(false); }}
          >
            {dueDateText}
          </button>
          {activeDatePicker === 'due' && (
            <div className="detail-date-popover">
              <DatePicker
                isRange
                startDateValue={task.startDate}
                endDateValue={task.dueDate}
                onRangeChange={(start, end) => {
                  updateTask(task.id, { startDate: start, dueDate: end });
                }}
                onClose={() => setActiveDatePicker(null)}
              />
            </div>
          )}
        </div>
      </DetailRow>

      {/* Completed Date Row */}
      {task.completed && (
        <DetailRow
          icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>}
          label="Completed Date"
        >
          <div ref={completedDateContainerRef} style={{ position: 'relative' }}>
            <button
              className="detail-inline-btn"
              style={{ color: completedDateColor }}
              onClick={() => { setActiveDatePicker(activeDatePicker === 'completed' ? null : 'completed'); setShowReminderPicker(false); setShowRepeatPicker(false); setShowPriorityPicker(false); }}
            >
              {completedDateText}
            </button>
            {activeDatePicker === 'completed' && (
              <div className="detail-date-popover">
                <DatePicker
                  value={task.completedAt}
                  onChange={(d) => {
                    updateTask(task.id, { completedAt: d });
                    setActiveDatePicker(null);
                  }}
                  onRemove={() => {
                    updateTask(task.id, { completedAt: null });
                    setActiveDatePicker(null);
                  }}
                  onClose={() => setActiveDatePicker(null)}
                />
              </div>
            )}
          </div>
        </DetailRow>
      )}

      {/* Project Row */}
      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2h10l-2 4 2 4H2l2-4-2-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>}
        label="Project"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          {project && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: project.color, flexShrink: 0 }} />}
          <select
            className="detail-select"
            value={task.projectId || ''}
            onChange={(e) => updateTask(task.id, { projectId: e.target.value || null })}
            style={{ flex: 1 }}
          >
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </DetailRow>

      {/* Reminder Row */}
      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v2M7 10v2M2 7h2M10 7h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
        </svg>}
        label="Reminder"
      >
        <div ref={reminderContainerRef} style={{ position: 'relative' }}>
          <button
            className="detail-inline-btn"
            onClick={() => { setShowReminderPicker(!showReminderPicker); setActiveDatePicker(null); }}
            style={{ color: task.reminder ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {task.reminder ? dateUtils.formatFullDateTime(task.reminder) : 'None'}
          </button>
          {showReminderPicker && (
            <div className="detail-date-popover">
              <DatePicker
                value={task.reminder}
                showTime
                onChange={(d) => {
                  updateTask(task.id, { reminder: d });
                  setShowReminderPicker(false);
                }}
                onRemove={() => {
                  updateTask(task.id, { reminder: null });
                  setShowReminderPicker(false);
                }}
                onClose={() => setShowReminderPicker(false)}
              />
            </div>
          )}
        </div>
      </DetailRow>

      {/* Repeat Row */}
      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7a5 5 0 1 0 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M7 2v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>}
        label="Repeat"
      >
        <div ref={repeatContainerRef} style={{ position: 'relative' }}>
          <button
            className="detail-inline-btn"
            onClick={() => { setShowRepeatPicker(!showRepeatPicker); setActiveDatePicker(null); setShowReminderPicker(false); }}
            style={{ color: task.repeat && task.repeat !== 'none' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {describeRecurrence(task.repeat, task.repeatCustom)}
          </button>
          {showRepeatPicker && (
            <div className="detail-date-popover">
              <RepeatEditor
                value={toRecurrence(task.repeat, task.repeatCustom)}
                onChange={(repeat, repeatCustom) =>
                  updateTask(task.id, { repeat: repeat as RepeatType, repeatCustom })
                }
                onClose={() => setShowRepeatPicker(false)}
              />
            </div>
          )}
        </div>
      </DetailRow>

      <SubtaskList task={task} />

      {/* Component quản lý ảnh đính kèm */}
      <TaskAttachments task={task} />

      {/* Component quản lý nhật ký liên kết */}
      <TaskDiaries task={task} />

      <div className="detail-note-section">
        <textarea
          className="detail-note"
          placeholder="Add note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          rows={4}
        />
      </div>

      <style>{`
        .task-detail { padding-bottom: 20px; outline: none; }
        .detail-inline-btn { background: none; border: none; cursor: pointer; font-size: var(--text-sm); padding: 0; font-family: var(--font-main); }
        .detail-inline-btn:hover { text-decoration: underline; }
        .detail-muted { color: var(--text-tertiary); }
        .detail-date-popover { position: absolute; right: 0; top: calc(100% + 8px); z-index: 200; background: var(--bg-dialog); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); animation: slide-in-down 150ms ease both; }
        .detail-select { background: none; border: none; outline: none; color: var(--text-primary); font-size: var(--text-sm); cursor: pointer; font-family: var(--font-main); }
        .detail-select option { background: var(--bg-dialog); }
        .detail-note-section { padding: 12px 0; }
        .detail-note { width: 100%; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 10px 12px; color: var(--text-primary); font-size: var(--text-sm); font-family: var(--font-main); resize: vertical; outline: none; line-height: 1.6; transition: border-color var(--transition-fast); }
        .detail-note:focus { border-color: var(--accent); }
        .detail-note::placeholder { color: var(--text-tertiary); }
        .detail-attachments-section { padding: 12px 0; border-bottom: 1px solid var(--divider); }
        .attachments-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .attachments-title { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); }
        .attachments-add-btn { font-size: var(--text-xs); font-weight: 500; color: var(--accent); cursor: pointer; padding: 4px 8px; border-radius: 4px; background: var(--bg-card-hover); transition: background 0.2s; }
        .attachments-add-btn:hover { background: var(--divider); }
        .attachments-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .attachment-card { position: relative; width: 64px; height: 64px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border); }
        .attachment-thumb { width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: transform 0.2s; }
        .attachment-thumb:hover { transform: scale(1.05); }
        .attachment-delete { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0, 0, 0, 0.6); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity 0.2s; }
        .attachment-card:hover .attachment-delete { opacity: 1; }
        .attachment-delete:hover { background: var(--priority-high); }
        .attachments-placeholder { display: flex; align-items: center; justify-content: center; padding: 12px; border: 1.5px dashed var(--border-strong); border-radius: var(--radius-md); color: var(--text-tertiary); font-size: var(--text-xs); background: rgba(255, 255, 255, 0.015); text-align: center; }
        .priority-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border: none; background: none; cursor: pointer; border-radius: var(--radius-xs); font-size: var(--text-sm); color: var(--text-secondary); font-family: var(--font-main); transition: background var(--transition-fast); }
        .priority-option:hover, .priority-option.active { background: var(--glass-bg-hover); color: var(--text-primary); }
        .detail-diary-section { padding: 12px 0; border-bottom: 1px solid var(--divider); }
        .diary-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .diary-section-title { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); }
        .diary-add-btn { font-size: var(--text-xs); font-weight: 500; color: var(--accent); cursor: pointer; padding: 4px 8px; border-radius: 4px; background: var(--bg-card-hover); border: none; font-family: var(--font-main); transition: background 0.2s; }
        .diary-add-btn:hover { background: var(--divider); }
        .diary-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
        .diary-item-link { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg-input); cursor: pointer; transition: all 0.2s; }
        .diary-item-link:hover { border-color: var(--accent); background: var(--bg-card-hover); }
        .diary-item-title { font-size: var(--text-sm); color: var(--text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .diary-item-date { font-size: var(--text-xs); color: var(--text-tertiary); flex-shrink: 0; }
        .diary-placeholder { display: flex; align-items: center; justify-content: center; padding: 12px; border: 1.5px dashed var(--border-strong); border-radius: var(--radius-md); color: var(--text-tertiary); font-size: var(--text-xs); background: rgba(255, 255, 255, 0.015); text-align: center; }
      `}</style>
    </div>
  );
};

export default TaskDetail;
