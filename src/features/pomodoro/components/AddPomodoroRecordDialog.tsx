import React, { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useAppContext } from '@/core/contexts/AppContext';
import DatePicker from '@/shared/components/DatePicker';
import { uuid } from '@/utils/uuid';
import { dateUtils } from '@/utils/dateUtils';
import type { PomodoroRecord, PomodoroSession, Task } from '@/types';

const AddPomodoroRecordDialog: React.FC = () => {
  const { tasks, selectedTaskId, addPomodoroRecord, addPomodoroSession, updateTask } = useTaskContext();
  const { openModal, setOpenModal, settings } = useAppContext();

  const [associatedTask, setAssociatedTask] = useState<Task | null>(null);
  const [startTime, setStartTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(25);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const datePickerRef = useRef<HTMLDivElement>(null);

  const isOpen = openModal === 'add-pomodoro-record';

  // Cập nhật giá trị mặc định khi mở modal
  useEffect(() => {
    if (isOpen) {
      const currentTask = tasks.find((t) => t.id === selectedTaskId) || null;
      setAssociatedTask(currentTask);
      setStartTime(dateUtils.now());
      setDuration(settings?.pomodoroLength || 25);
      setShowDatePicker(false);
    }
  }, [isOpen, selectedTaskId, tasks, settings]);

  // Click outside to close date picker
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (showDatePicker && datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDatePicker]);

  if (!isOpen) return null;

  const handleClose = () => {
    setOpenModal(null);
  };

  const formatPomodoroDateTime = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.toLocaleString('en', { month: 'short' });
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
  };

  const handleSubmit = () => {
    const recordId = uuid();
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    const newRecord: PomodoroRecord = {
      id: recordId,
      taskId: associatedTask?.id || null,
      taskTitle: associatedTask?.title || null,
      startTime: startTime,
      endTime: endDate.toISOString(),
      breakStart: null,
      breakEnd: null,
      completed: true,
      createdAt: dateUtils.now(),
      updatedAt: dateUtils.now(),
    };

    const newSession: PomodoroSession = {
      id: uuid(),
      taskId: associatedTask?.id || null,
      taskTitle: associatedTask?.title || null,
      type: 'focus',
      duration: duration,
      startTime: startTime,
      endTime: endDate.toISOString(),
      completed: true,
    };

    // Thêm bản ghi và phiên làm việc
    addPomodoroRecord(newRecord);
    addPomodoroSession(newSession);

    // Cộng dồn tiến trình cho công việc liên kết
    if (associatedTask) {
      updateTask(associatedTask.id, {
        pomodoroCompleted: (associatedTask.pomodoroCompleted ?? 0) + 1,
        totalFocusTime: (associatedTask.totalFocusTime ?? 0) + duration,
      });
    }

    handleClose();
  };

  const activeTasks = tasks.filter((t) => !t.completed || t.id === associatedTask?.id);

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="pomo-record-dialog animate-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="pomo-dialog-title">New Pomodoro Record</h3>

        <div className="pomo-dialog-fields">
          {/* Dòng Tên công việc */}
          <div className="pomo-field-row">
            <div className="pomo-field-label-group">
              <svg className="pomo-field-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="pomo-field-label">Task Name</span>
            </div>
            <div className="pomo-field-value-group">
              {associatedTask ? (
                <div className="pomo-task-tag">
                  <span className="pomo-task-name">{associatedTask.title}</span>
                  <button type="button" className="pomo-task-clear" onClick={() => setAssociatedTask(null)} aria-label="Clear task">
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  className="pomo-task-select"
                  value=""
                  onChange={(e) => {
                    const t = tasks.find((tk) => tk.id === e.target.value);
                    if (t) setAssociatedTask(t);
                  }}
                >
                  <option value="">No Task</option>
                  {activeTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Dòng Thời gian bắt đầu */}
          <div className="pomo-field-row">
            <div className="pomo-field-label-group">
              <svg className="pomo-field-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="pomo-field-label">Start Time</span>
            </div>
            <div className="pomo-field-value-group" ref={datePickerRef}>
              <button
                type="button"
                className="pomo-time-trigger"
                onClick={() => setShowDatePicker((prev) => !prev)}
              >
                {formatPomodoroDateTime(startTime)}
              </button>
              {showDatePicker && (
                <div className="pomo-datepicker-popover">
                  <DatePicker
                    value={startTime}
                    showTime
                    onChange={(iso) => {
                      setStartTime(iso);
                    }}
                    onClose={() => setShowDatePicker(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dòng Thời lượng */}
          <div className="pomo-field-row">
            <div className="pomo-field-label-group">
              <svg className="pomo-field-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="9" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 2v2M6 2h4M8 6v3h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="pomo-field-label">Pomodoro Length</span>
            </div>
            <div className="pomo-field-value-group">
              <div className="pomo-duration-wrapper">
                <input
                  type="number"
                  className="pomo-duration-input"
                  value={duration}
                  min="1"
                  max="1440"
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                />
                <span className="pomo-duration-unit">m</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pomo-dialog-footer">
          <button type="button" className="pomo-btn pomo-btn--cancel" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="pomo-btn pomo-btn--ok" onClick={handleSubmit}>
            OK
          </button>
        </div>
      </div>

      <style>{`
        .pomo-record-dialog {
          background: #1a1b23;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          width: 380px;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
        }
        .pomo-dialog-title {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
          text-align: center;
          margin: 0;
        }
        .pomo-dialog-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pomo-field-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 36px;
          position: relative;
        }
        .pomo-field-label-group {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
        }
        .pomo-field-icon {
          flex-shrink: 0;
          color: var(--text-tertiary);
        }
        .pomo-field-label {
          font-size: var(--text-sm);
          font-weight: 500;
        }
        .pomo-field-value-group {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          color: var(--text-primary);
          font-size: var(--text-sm);
        }
        .pomo-task-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-card-hover);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          max-width: 180px;
        }
        .pomo-task-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }
        .pomo-task-clear {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          font-size: 11px;
          padding: 0 2px;
          transition: color var(--transition-fast);
        }
        .pomo-task-clear:hover {
          color: var(--text-primary);
        }
        .pomo-task-select {
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          padding: 4px 8px;
          font-size: var(--text-xs);
          font-family: var(--font-main);
          outline: none;
          cursor: pointer;
          max-width: 180px;
        }
        .pomo-task-select option {
          background: var(--bg-dialog);
        }
        .pomo-time-trigger {
          background: none;
          border: none;
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-family: var(--font-main);
          font-weight: 500;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast);
        }
        .pomo-time-trigger:hover {
          background: var(--bg-card-hover);
        }
        .pomo-datepicker-popover {
          position: absolute;
          right: 0;
          bottom: calc(100% + 8px);
          z-index: 2100;
          background: var(--bg-dialog);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          animation: slide-in-down 150ms ease both;
        }
        .pomo-duration-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .pomo-duration-input {
          background: none;
          border: none;
          border-bottom: 1.5px solid var(--border-strong);
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-family: var(--font-main);
          font-weight: 600;
          width: 50px;
          text-align: right;
          outline: none;
          padding: 2px 4px;
          transition: border-color var(--transition-fast);
        }
        .pomo-duration-input:focus {
          border-color: var(--accent);
        }
        .pomo-duration-unit {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          font-weight: 500;
        }
        .pomo-dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }
        .pomo-btn {
          padding: 8px 24px;
          border-radius: 8px;
          border: 1px solid var(--border);
          cursor: pointer;
          font-size: var(--text-sm);
          font-family: var(--font-main);
          font-weight: 500;
          transition: all var(--transition-fast);
        }
        .pomo-btn--cancel {
          background: none;
          color: var(--text-secondary);
        }
        .pomo-btn--cancel:hover {
          background: var(--glass-bg-hover);
        }
        .pomo-btn--ok {
          background: #ff5a5f;
          color: white;
          border-color: #ff5a5f;
        }
        .pomo-btn--ok:hover {
          background: #ff787c;
          border-color: #ff787c;
        }
      `}</style>
    </div>
  );
};

export default AddPomodoroRecordDialog;
