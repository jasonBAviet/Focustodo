import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import type { Task, RepeatType } from '../../types';
import { dateUtils } from '../../utils/dateUtils';
import { describeRecurrence, toRecurrence } from '../../utils/recurrence';
import SubtaskList from './SubtaskList';
import DatePicker from '../common/DatePicker';
import PomodoroScrollPicker from '../common/PomodoroScrollPicker';
import RepeatEditor from './RepeatEditor';
import { useInjectedStyle } from '../../hooks/useInjectedStyle';

interface TaskDetailProps {
  task: Task;
}

const DETAIL_ROW_CSS = `
      .detail-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 0; border-bottom: 1px solid var(--divider);
        font-size: var(--text-sm); min-height: 40px;
        position: relative;
      }
      .detail-row__icon { color: var(--text-tertiary); flex-shrink: 0; width: 16px; }
      .detail-row__label { color: var(--text-secondary); flex: 1; }
      .detail-row__value { color: var(--text-primary); font-size: var(--text-sm); }
`;

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => {
  useInjectedStyle('detail-row', DETAIL_ROW_CSS);
  return (
    <div className="detail-row">
      <span className="detail-row__icon">{icon}</span>
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value">{children}</span>
    </div>
  );
};

const PomodoroRow: React.FC<{ task: Task; onUpdate: (estimate: number) => void }> = ({ task, onUpdate }) => {
  const [showPicker, setShowPicker] = useState(false);
  const POMO_DURATION = 25;

  return (
    <>
      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>}
        label="Pomodoro"
      >
        <button
          className="pomo-trigger"
          onClick={() => setShowPicker(true)}
          title="Chinh sua so Pomodoro"
        >
          <span className="pomo-trigger__count">{task.pomodoroEstimate || 0}</span>
          <span className="pomo-trigger__meta">
            {task.pomodoroCompleted}/{task.pomodoroEstimate || 0} = {(task.pomodoroEstimate || 0) * POMO_DURATION}m
          </span>
        </button>
        <style>{`
          .pomo-trigger {
            display: flex; align-items: center; gap: 8px;
            background: none; border: none; cursor: pointer;
            padding: 2px 4px; border-radius: 6px;
            transition: background var(--transition-fast);
          }
          .pomo-trigger:hover { background: var(--bg-card-hover); }
          .pomo-trigger__count {
            font-weight: 600; font-size: 15px;
            color: var(--text-primary); min-width: 18px; text-align: center;
            font-family: var(--font-main);
          }
          .pomo-trigger__meta {
            font-size: var(--text-xs); color: var(--text-tertiary);
          }
        `}</style>
      </DetailRow>
      {showPicker && (
        <PomodoroScrollPicker
          estimate={task.pomodoroEstimate || 0}
          pomoDuration={POMO_DURATION}
          onEstimateChange={onUpdate}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
};

const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  const { updateTask, projects } = useTaskContext();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
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
      ? 'Today'
      : dateUtils.isTomorrow(task.dueDate)
        ? 'Tomorrow'
        : dateUtils.formatShort(task.dueDate)
    : 'None';

  const dueDateColor = task.dueDate && dateUtils.isOverdue(task.dueDate)
    ? 'var(--priority-high)'
    : task.dueDate
      ? 'var(--text-primary)'
      : 'var(--text-tertiary)';

  return (
    <div className="task-detail">
      <PomodoroRow task={task} onUpdate={(e) => updateTask(task.id, { pomodoroEstimate: e })} />

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
            ? (() => {
              const [datePart, timePart] = task.reminder.split('T');
              return `${dateUtils.formatShort(datePart)}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`;
            })()
            : 'None'}
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
      </DetailRow>

      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7a5 5 0 1 0 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M7 2v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>}
        label="Repeat"
      >
        <button
          className="detail-inline-btn"
          onClick={() => { setShowRepeatPicker(!showRepeatPicker); setShowDatePicker(false); setShowReminderPicker(false); }}
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
      </DetailRow>

      <SubtaskList task={task} />

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
