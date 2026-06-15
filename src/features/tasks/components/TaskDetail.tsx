import React, { useState, useEffect } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useDiaryContext } from '@/features/diary/DiaryContext';
import type { Task, RepeatType, Priority } from '@/types';
import { dateUtils } from '@/utils/dateUtils';
import { describeRecurrence, toRecurrence } from '@/utils/recurrence';
import SubtaskList from '@/features/tasks/components/SubtaskList';
import DatePicker from '@/shared/components/DatePicker';
import RepeatEditor from '@/features/tasks/components/RepeatEditor';
import { DetailRow, PomodoroRow } from './TaskDetailHelpers';
import Lightbox from '@/shared/components/Lightbox';

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
  const { updateTask, projects, attachments, addAttachment, deleteAttachment, setActiveView } = useTaskContext();
  const { diaries, addDiary, setSelectedDiaryId } = useDiaryContext();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [note, setNote] = useState(task.note);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setNote(task.note); }, [task.id]);

  const project = projects.find((p) => p.id === task.projectId);
  const taskAttachments = (attachments || []).filter((a) => a.taskId === task.id);

  const linkedDiaries = diaries.filter((d) => d.taskId === task.id);

  const handleCreateDiaryForTask = () => {
    const today = new Date();
    const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const newDiary = addDiary(`Nhật ký: ${task.title} (${dateStr})`, task.projectId, task.priority, task.id);
    if (newDiary) {
      setSelectedDiaryId(newDiary.id);
      setActiveView('diary');
    }
  };

  const handleGoToDiary = (diaryId: string) => {
    setSelectedDiaryId(diaryId);
    setActiveView('diary');
  };

  const handleNoteBlur = () => {
    if (note !== task.note) {
      updateTask(task.id, { note });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert('Maximum image size is 5MB');

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      addAttachment({
        id: Math.random().toString(36).substring(2, 9),
        taskId: task.id,
        fileName: file.name,
        fileUrl: data.url,
        fileSize: file.size,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      });
    } catch {
      alert('Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;
        if (file.size > 5 * 1024 * 1024) return alert('Maximum image size is 5MB');
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/upload`, { method: 'POST', body: fd });
          if (!res.ok) throw new Error();
          const data = await res.json();
          addAttachment({
            id: Math.random().toString(36).substring(2, 9),
            taskId: task.id,
            fileName: file.name || `clipboard-${Date.now()}.png`,
            fileUrl: data.url,
            fileSize: file.size,
            mimeType: file.type,
            createdAt: new Date().toISOString(),
          });
        } catch {
          alert('Could not upload image');
        } finally {
          setUploading(false);
        }
        break;
      }
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
    <div className="task-detail" onPaste={handlePaste}>
      <PomodoroRow task={task} onUpdate={(e) => updateTask(task.id, { pomodoroEstimate: e })} />

      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ color: PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.color || '#888' }}>
          <path d="M2 2h10l-2 4 2 4H2l2-4-2-4z"/>
        </svg>}
        label="Priority"
      >
        <div style={{ position: 'relative' }}>
          <button
            className="detail-inline-btn"
            style={{ color: PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.color || '#888' }}
            onClick={() => { setShowPriorityPicker((v) => !v); setShowDatePicker(false); setShowReminderPicker(false); setShowRepeatPicker(false); }}
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

      <div className="detail-attachments-section">
        <div className="attachments-header">
          <span className="attachments-title">Attached images</span>
          <label className="attachments-add-btn">
            {uploading ? 'Uploading...' : 'Add image'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
          </label>
        </div>
        {taskAttachments.length > 0 ? (
          <div className="attachments-grid">
            {taskAttachments.map((a) => (
              <div key={a.id} className="attachment-card">
                <img src={a.fileUrl} alt={a.fileName} className="attachment-thumb" onClick={() => { setLightboxImg(a.fileUrl); setLightboxOpen(true); }} />
                <button type="button" className="attachment-delete" onClick={() => deleteAttachment(a.id)} title="Delete image">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4M6 4V2.5A1.5 1.5 0 0 1 7.5 1h1A1.5 1.5 0 0 1 10 2.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="attachments-placeholder">
            Press Ctrl+V to paste screenshot directly here
          </div>
        )}
      </div>

      {/* Nhat ky lien ket */}
      <div className="detail-diary-section">
        <div className="diary-header">
          <span className="diary-section-title">Nhật ký liên kết</span>
          <button 
            type="button" 
            className="diary-add-btn"
            onClick={handleCreateDiaryForTask}
          >
            + Viết nhật ký
          </button>
        </div>
        {linkedDiaries.length > 0 ? (
          <div className="diary-list">
            {linkedDiaries.map((d) => (
              <div 
                key={d.id} 
                className="diary-item-link"
                onClick={() => handleGoToDiary(d.id)}
              >
                <span className="diary-item-title">{d.title}</span>
                <span className="diary-item-date">{dateUtils.formatShort(d.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="diary-placeholder">
            Chưa có nhật ký nào liên kết với công việc này.
          </div>
        )}
      </div>

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

      <Lightbox isOpen={lightboxOpen} imageUrl={lightboxImg} onClose={() => setLightboxOpen(false)} />

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
