import React, { useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import type { Task, RepeatType } from '../../types';
import { dateUtils } from '../../utils/dateUtils';
import SubtaskList from './SubtaskList';

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
          <span
            key={i}
            className={`pomo-dot ${i < task.pomodoroCompleted ? 'done' : ''}`}
          />
        ))}
        <span className="pomo-label">
          {task.pomodoroCompleted}/{task.pomodoroEstimate || 0} = {(task.pomodoroEstimate || 0) * 25}m
        </span>
      </div>
      <style>{`
        .pomo-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
        .pomo-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--border-strong); flex-shrink: 0;
        }
        .pomo-dot.done { background: var(--accent); }
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
  const [note, setNote] = useState(task.note);

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
          onClick={() => setShowDatePicker(!showDatePicker)}
        >
          {dueDateText}
        </button>
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
        <span className="detail-muted">{task.reminder || 'Khong'}</span>
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
