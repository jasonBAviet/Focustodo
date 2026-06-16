import React, { useState } from 'react';
import type { Task } from '@/types';
import { useTaskContext } from '@/features/tasks/TaskContext';
import Lightbox from '@/shared/components/Lightbox';

interface TaskAttachmentsProps {
  task: Task;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({ task }) => {
  const { attachments, addAttachment, deleteAttachment } = useTaskContext();
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState('');

  const taskAttachments = (attachments || []).filter((a) => a.taskId === task.id);

  const uploadFile = async (file: File) => {
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
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert('Maximum image size is 5MB');
    await uploadFile(file);
  };

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        // Neu dang paste trong note textarea thi cho phep paste binh thuong, khong hijack
        return;
      }

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;
          if (file.size > 5 * 1024 * 1024) {
            alert('Maximum image size is 5MB');
            continue;
          }
          void uploadFile(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [task.id, addAttachment]);

  return (
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

      <Lightbox isOpen={lightboxOpen} imageUrl={lightboxImg} onClose={() => setLightboxOpen(false)} />
    </div>
  );
};

export default TaskAttachments;
