import React, { useState } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import type { Task } from '@/types';
import Lightbox from '@/shared/components/Lightbox';

interface SubtaskListProps {
  task: Task;
}

const SubtaskList: React.FC<SubtaskListProps> = ({ task }) => {
  const { addSubtask, toggleSubtask, deleteSubtask, updateTask } = useTaskContext();
  const [newSubtask, setNewSubtask] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState('');

  const handleAdd = () => {
    if (!newSubtask.trim()) return;
    addSubtask(task.id, newSubtask.trim());
    setNewSubtask('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !(e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewSubtask('');
      setShowInput(false);
    }
  };

  const handleBlur = () => {
    if (newSubtask.trim()) handleAdd();
    setShowInput(false);
  };

  const handleUploadSubtaskImage = async (subtaskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert('Maximum image size is 5MB');

    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newAttach = {
        id: Math.random().toString(36).substring(2, 9),
        fileName: file.name,
        fileUrl: data.url,
        fileSize: file.size,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      };
      
      const updatedSubtasks = task.subtasks.map(s => {
        if (s.id === subtaskId) {
          const currentAttach = s.attachments || [];
          return { ...s, attachments: [...currentAttach, newAttach] };
        }
        return s;
      });
      updateTask(task.id, { subtasks: updatedSubtasks });
    } catch {
      alert('Could not upload image');
    }
  };

  const handleDeleteSubtaskImage = (subtaskId: string, attachId: string) => {
    const updatedSubtasks = task.subtasks.map(s => {
      if (s.id === subtaskId) {
        return { ...s, attachments: (s.attachments || []).filter(a => a.id !== attachId) };
      }
      return s;
    });
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  return (
    <div className="subtask-section">
      {/* Subtask items */}
      {task.subtasks.map((sub) => (
        <div key={sub.id} className="subtask-item">
          <button
            className={`subtask-check ${sub.completed ? 'checked' : ''}`}
            onClick={() => toggleSubtask(task.id, sub.id)}
          >
            {sub.completed && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <span className={`subtask-title ${sub.completed ? 'done' : ''}`}>
            {sub.title}
          </span>

          <div className="subtask-meta-actions">
            {(sub.attachments || []).map((a) => (
              <div key={a.id} className="sub-attach-card">
                <img
                  src={a.fileUrl}
                  alt={a.fileName}
                  className="sub-attach-thumb"
                  onClick={() => {
                    setLightboxImg(a.fileUrl);
                    setLightboxOpen(true);
                  }}
                />
                <button
                  type="button"
                  className="sub-attach-delete"
                  onClick={() => handleDeleteSubtaskImage(sub.id, a.id)}
                >
                  ×
                </button>
              </div>
            ))}
            <label className="sub-attach-add" title="Add image">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 13.5H2.5V4.5H5.5L7 2.5H9L10.5 4.5H13.5V13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleUploadSubtaskImage(sub.id, e)}
              />
            </label>
          </div>

          <button
            className="subtask-delete"
            onClick={() => deleteSubtask(task.id, sub.id)}
            title="Delete"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}

      {/* Add subtask */}
      {showInput ? (
        <div className="subtask-add-row">
          <span className="subtask-add-icon">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M4 1v6M1 4h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            autoFocus
            className="subtask-input"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Subtask name, press Enter to save"
          />
        </div>
      ) : (
        <button
          className="subtask-add-btn"
          onClick={() => setShowInput(true)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add subtask
        </button>
      )}

      <Lightbox isOpen={lightboxOpen} imageUrl={lightboxImg} onClose={() => setLightboxOpen(false)} />

      <style>{`
        .subtask-section { padding: 8px 0; border-bottom: 1px solid var(--divider); }
        .subtask-item {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 0;
        }
        .subtask-item:hover .subtask-delete { opacity: 1; }
        .subtask-check {
          width: 14px; height: 14px; border-radius: 3px;
          border: 1.5px solid var(--border-strong);
          background: none; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all var(--transition-fast);
        }
        .subtask-check:hover { border-color: var(--accent); }
        .subtask-check.checked { background: var(--accent); border-color: var(--accent); }
        .subtask-title {
          flex: 1; font-size: var(--text-sm); color: var(--text-primary);
        }
        .subtask-title.done {
          color: var(--text-tertiary); text-decoration: line-through;
        }
        .subtask-delete {
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast);
          padding: 2px; border-radius: 3px; display: flex;
        }
        .subtask-delete:hover { color: var(--priority-high); }
        .subtask-add-row {
          display: flex; align-items: center; gap: 8px; padding: 5px 0;
        }
        .subtask-add-icon { color: var(--text-tertiary); flex-shrink: 0; }
        .subtask-input {
          flex: 1; background: none; border: none; outline: none;
          border-bottom: 1px solid var(--accent);
          color: var(--text-primary); font-size: var(--text-sm);
          font-family: var(--font-main); padding: 2px 0;
        }
        .subtask-input::placeholder { color: var(--text-tertiary); }
        .subtask-add-btn {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); font-size: var(--text-sm);
          font-family: var(--font-main); padding: 6px 0;
          transition: color var(--transition-fast);
        }
        .subtask-add-btn:hover { color: var(--accent); }

        .subtask-meta-actions { display: flex; align-items: center; gap: 6px; margin-right: 4px; }
        .sub-attach-card { position: relative; width: 26px; height: 26px; border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
        .sub-attach-thumb { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
        .sub-attach-delete { position: absolute; top: -2px; right: -2px; width: 11px; height: 11px; border-radius: 50%; background: rgba(0,0,0,0.65); color: #fff; border: none; font-size: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .sub-attach-add { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 4px; border: 1px dashed var(--border-strong); color: var(--text-tertiary); cursor: pointer; transition: all 0.2s; }
        .sub-attach-add:hover { border-color: var(--accent); color: var(--accent); }
      `}</style>
    </div>
  );
};

export default SubtaskList;
