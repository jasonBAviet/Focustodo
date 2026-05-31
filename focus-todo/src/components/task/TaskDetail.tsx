import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import type { Task, RepeatType } from '../../types';
import { dateUtils } from '../../utils/dateUtils';
import SubtaskList from './SubtaskList';
import DatePicker from '../common/DatePicker';

interface TaskDetailProps {
  task: Task;
}

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div className="detail-row">
    <span className="detail-row__icon">{icon}</span>
    <span className="detail-row__label">{label}</span>
    <span className="detail-row__value">{children}</span>
    <style>{`
      .detail-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 0; border-bottom: 1px solid var(--divider);
        font-size: var(--text-sm); min-height: 40px;
        position: relative;
      }
      .detail-row__icon { color: var(--text-tertiary); flex-shrink: 0; width: 16px; }
      .detail-row__label { color: var(--text-secondary); flex: 1; }
      .detail-row__value { color: var(--text-primary); font-size: var(--text-sm); }
    `}</style>
  </div>
);

const PomodoroRow: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <DetailRow
      icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>}
      label="Pomodoro"
    >
      <div className="pomo-row">
        {Array.from({ length: Math.max(task.pomodoroEstimate, task.pomodoroCompleted, 4) }).map((_, i) => (
          <svg
            key={i}
            className={`pomo-icon ${i < task.pomodoroCompleted ? 'done' : ''}`}
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M12 21c5.523 0 10-4.477 10-10 0-4.7-3-8.5-7.5-9.6a4.5 4.5 0 0 0-5 0C5 2.5 2 6.3 2 11c0 5.523 4.477 10 10 10z" className="tomato-body" />
            <path d="M12 3v4" className="tomato-stem" />
            <path d="M9 4s1-1 3-1 3 1 3 1" className="tomato-stem" />
          </svg>
        ))}
        <span className="pomo-label">
          {task.pomodoroCompleted}/{task.pomodoroEstimate || 0} = {(task.pomodoroEstimate || 0) * 25}m
        </span>
      </div>
      <style>{`
        .pomo-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
        .pomo-icon {
          color: var(--border-strong); flex-shrink: 0;
        }
        .pomo-icon.done { color: var(--accent); }
        .pomo-icon .tomato-body { fill: currentColor; stroke: none; }
        .pomo-icon .tomato-stem { stroke: var(--bg-dialog); }
        .pomo-label { font-size: var(--text-xs); color: var(--text-tertiary); margin-left: 4px; }
      `}</style>
    </DetailRow>
  );
};

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: 'Khong' },
  { value: 'daily', label: 'Hang ngay' },
  { value: 'weekly', label: 'Hang tuan' },
  { value: 'monthly', label: 'Hang thang' },
];

const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  const { updateTask, projects } = useTaskContext();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [note, setNote] = useState(task.note);

  useEffect(() => { setNote(task.note); }, [task.id]);

  const project = projects.find((p) => p.id === task.projectId);

  const handleNoteBlur = () => {
    if (note !== task.note) {
      updateTask(task.id, { note });
    }
  };

  const dueDateText = task.dueDate
    ? dateUtils.isToday(task.dueDate)
      ? 'Hom nay'
      : dateUtils.isTomorrow(task.dueDate)
        ? 'Ngay mai'
        : dateUtils.formatShort(task.dueDate)
    : 'Khong co';

  const dueDateColor = task.dueDate && dateUtils.isOverdue(task.dueDate)
    ? 'var(--priority-high)'
    : task.dueDate
      ? 'var(--text-primary)'
      : 'var(--text-tertiary)';

  return (
    <div className="task-detail">
      <PomodoroRow task={task} />

      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 2v2M9 2v2M2 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>}
        label="Due Date"
      >
        <button
          className="detail-inline-btn"
          style={{ color: dueDateColor }}
          onClick={() => { setShowDatePicker(!showDatePicker); setShowReminderPicker(false); }}
        >
          {dueDateText}
        </button>
        {showDatePicker && (
          <div className="detail-date-popover">
            <DatePicker
              value={task.dueDate}
              onChange={(d) => {
                updateTask(task.id, { dueDate: d });
                setShowDatePicker(false);
              }}
              onRemove={() => {
                updateTask(task.id, { dueDate: null });
                setShowDatePicker(false);
              }}
              onClose={() => setShowDatePicker(false)}
            />
          </div>
        )}
      </DetailRow>

      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2h10l-2 4 2 4H2l2-4-2-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>}
        label="Project"
      >
        <span style={{ color: project?.color }}>
          {project?.name || 'Khong co project'}
        </span>
      </DetailRow>

      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v2M7 10v2M2 7h2M10 7h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
        </svg>}
        label="Reminder"
      >
        <button
          className="detail-inline-btn"
          onClick={() => { setShowReminderPicker(!showReminderPicker); setShowDatePicker(false); }}
          style={{ color: task.reminder ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
        >
          {task.reminder
            ? dateUtils.formatShort(task.reminder)
            : 'Khong'}
        </button>
        {showReminderPicker && (
          <div className="detail-date-popover">
            <DatePicker
              value={task.reminder}
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
      </DetailRow>

      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7a5 5 0 1 0 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M7 2v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>}
        label="Repeat"
      >
        <select
          className="detail-select"
          value={task.repeat}
          onChange={(e) => updateTask(task.id, { repeat: e.target.value as RepeatType })}
        >
          {REPEAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </DetailRow>

      <SubtaskList task={task} />

      <div className="detail-note-section">
        <textarea
          className="detail-note"
          placeholder="Them ghi chu..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          rows={4}
        />
      </div>

      <style>{`
        .task-detail { padding-bottom: 20px; }
        .detail-inline-btn {
          background: none; border: none; cursor: pointer;
          font-size: var(--text-sm); padding: 0;
          font-family: var(--font-main);
        }
        .detail-inline-btn:hover { text-decoration: underline; }
        .detail-muted { color: var(--text-tertiary); }
        .detail-date-popover {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          z-index: 200;
          background: var(--bg-dialog);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          animation: slide-in-down 150ms ease both;
        }
        .detail-select {
          background: none; border: none; outline: none;
          color: var(--text-primary); font-size: var(--text-sm);
          cursor: pointer; font-family: var(--font-main);
        }
        .detail-select option { background: var(--bg-dialog); }
        .detail-note-section { padding: 12px 0; }
        .detail-note {
          width: 100%; background: var(--bg-input);
          border: 1px solid var(--border); border-radius: var(--radius-md);
          padding: 10px 12px; color: var(--text-primary);
          font-size: var(--text-sm); font-family: var(--font-main);
          resize: vertical; outline: none; line-height: 1.6;
          transition: border-color var(--transition-fast);
        }
        .detail-note:focus { border-color: var(--accent); }
        .detail-note::placeholder { color: var(--text-tertiary); }
      `}</style>
    </div>
  );
};

export default TaskDetail;
