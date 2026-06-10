import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import type { Task } from '../../types';
import TagPicker from '../task/TagPicker';

interface KnowledgeDetailProps {
  knowledge: Task;
  onClose?: () => void;
}

import Lightbox from '../common/Lightbox';

const KnowledgeDetail: React.FC<KnowledgeDetailProps> = ({ knowledge, onClose }) => {
  const { updateTask, projects, tags, addTag, attachments, addAttachment, deleteAttachment } = useTaskContext();
  const [title, setTitle] = useState(knowledge.title);
  const [note, setNote] = useState(knowledge.note);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setTitle(knowledge.title);
    setNote(knowledge.note);
    setSaveStatus('idle');
  }, [knowledge.id]);

  const handleSave = () => {
    setSaveStatus('saving');
    updateTask(knowledge.id, {
      title: title.trim() || 'Ghi chú kiến thức chưa có tiêu đề',
      note,
    });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  };

  const insertFormatting = (before: string, after: string) => {
    const textarea = document.querySelector('.kd-note-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = before + selectedText + after;
    const newNote = text.substring(0, start) + replacement + text.substring(end);
    setNote(newNote);
    updateTask(knowledge.id, { note: newNote });
    setTimeout(() => {
      textarea.focus();
      if (start === end) {
        const pos = start + before.length;
        textarea.setSelectionRange(pos, pos);
      } else {
        textarea.setSelectionRange(start, start + replacement.length);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertFormatting('**', '**');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertFormatting('*', '*');
      return;
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      const textarea = document.querySelector('.kd-note-editor') as HTMLTextAreaElement;
      if (textarea) textarea.focus();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert('Kích thước ảnh tối đa là 5MB');

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      addAttachment({
        id: Math.random().toString(36).substring(2, 9),
        taskId: knowledge.id,
        fileName: file.name,
        fileUrl: data.url,
        fileSize: file.size,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      });
    } catch {
      alert('Không thể tải ảnh lên');
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
        if (file.size > 5 * 1024 * 1024) return alert('Kích thước ảnh tối đa là 5MB');
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/upload`, { method: 'POST', body: fd });
          if (!res.ok) throw new Error();
          const data = await res.json();
          addAttachment({
            id: Math.random().toString(36).substring(2, 9),
            taskId: knowledge.id,
            fileName: file.name || `clipboard-${Date.now()}.png`,
            fileUrl: data.url,
            fileSize: file.size,
            mimeType: file.type,
            createdAt: new Date().toISOString(),
          });
        } catch {
          alert('Không thể tải ảnh lên');
        } finally {
          setUploading(false);
        }
        break;
      }
    }
  };

  const selectedProject = projects.find((p) => p.id === knowledge.projectId);
  const knowledgeAttachments = (attachments || []).filter((a) => a.taskId === knowledge.id);

  return (
    <div className="knowledge-detail-container" onKeyDown={handleKeyDown} onPaste={handlePaste}>
      <div className="kd-header">
        <span className="kd-header-title">Chi tiết kiến thức</span>
        <div style={{ flex: 1 }} />
        {onClose && (
          <button className="kd-close-btn" onClick={onClose} title="Đóng panel">
            ✕
          </button>
        )}
      </div>

      <div className="kd-content-scroll">
        <input
          type="text"
          className="kd-title-input"
          placeholder="Nhập tiêu đề kiến thức..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          onBlur={handleSave}
        />

        <div className="kd-metadata-grid">
          <div className="kd-meta-item">
            <span className="kd-meta-label">Dự án</span>
            <div className="kd-project-select-wrap">
              {selectedProject && (
                <span className="kd-project-dot" style={{ backgroundColor: selectedProject.color }} />
              )}
              <select
                className="kd-meta-select"
                value={knowledge.projectId || ''}
                onChange={(e) => {
                  updateTask(knowledge.id, { projectId: e.target.value || null });
                  setSaveStatus('saved');
                  setTimeout(() => setSaveStatus('idle'), 2000);
                }}
              >
                <option value="">Không có dự án</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="kd-meta-item col-span-2">
            <span className="kd-meta-label">Thẻ (Tags)</span>
            <TagPicker
              taskTags={knowledge.tags || []}
              allTags={tags}
              onUpdate={(tagIds) => {
                updateTask(knowledge.id, { tags: tagIds });
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
              }}
              onAddTag={addTag}
            />
          </div>
        </div>

        <div className="kd-body-section">
          <textarea
            className="kd-note-editor"
            placeholder="Viết nội dung kiến thức ở đây..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            onBlur={handleSave}
            rows={10}
            autoFocus
          />

          {/* Anh dinh kem */}
          <div className="kd-attachments-section">
            <div className="kd-attachments-header">
              <span className="kd-attachments-title">Hình ảnh đính kèm</span>
              <label className="kd-attachments-add-btn">
                {uploading ? 'Đang tải...' : 'Thêm ảnh'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
              </label>
            </div>
            {knowledgeAttachments.length > 0 ? (
              <div className="kd-attachments-grid">
                {knowledgeAttachments.map((a) => (
                  <div key={a.id} className="kd-attachment-card">
                    <img src={a.fileUrl} alt={a.fileName} className="kd-attachment-thumb" onClick={() => { setLightboxImg(a.fileUrl); setLightboxOpen(true); }} />
                    <button type="button" className="kd-attachment-delete" onClick={() => deleteAttachment(a.id)} title="Xoá ảnh">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="kd-attachments-placeholder">
                Nhấn Ctrl+V để dán ảnh chụp màn hình trực tiếp tại đây
              </div>
            )}
          </div>
          
          <div className="kd-action-row">
            <span className="kd-shortcut-hint">Mẹo: Nhấn Ctrl+Enter để lưu · Ctrl+B bôi đậm · Ctrl+I in nghiêng</span>
            <button 
              className={`kd-save-btn ${saveStatus}`}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Đang lưu...' : saveStatus === 'saved' ? 'Đã lưu ✓' : 'Lưu kiến thức'}
            </button>
          </div>
        </div>
      </div>

      <Lightbox isOpen={lightboxOpen} imageUrl={lightboxImg} onClose={() => setLightboxOpen(false)} />

      <style>{`
        .knowledge-detail-container { display: flex; flex-direction: column; height: 100%; background: var(--bg-card); border-left: 1px solid var(--border); }
        .kd-header { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--border); background: rgba(255, 255, 255, 0.02); }
        .kd-header-title { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); }
        .kd-close-btn { background: none; border: none; color: var(--text-tertiary); font-size: 16px; cursor: pointer; padding: 4px; }
        .kd-close-btn:hover { color: var(--text-primary); }
        .kd-content-scroll { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 20px; }
        .kd-title-input { width: 100%; background: none; border: none; border-bottom: 1.5px solid transparent; color: var(--text-primary); font-size: 22px; font-weight: 600; outline: none; padding-bottom: 6px; transition: border-color var(--transition-fast); }
        .kd-title-input:focus { border-color: var(--accent); }
        .kd-metadata-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; background: rgba(255, 255, 255, 0.015); padding: 14px; border-radius: 8px; border: 1px solid var(--border); }
        .kd-meta-item { display: flex; flex-direction: column; gap: 6px; }
        .kd-meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); }
        .kd-project-select-wrap { display: flex; align-items: center; gap: 8px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; }
        .kd-project-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .kd-meta-select { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 13px; cursor: pointer; }
        .kd-meta-select option { background: var(--bg-dialog); }
        .kd-body-section { flex: 1; display: flex; flex-direction: column; gap: 14px; }
        .kd-note-editor { width: 100%; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; color: var(--text-primary); font-size: 14px; line-height: 1.6; font-family: var(--font-main); resize: vertical; outline: none; transition: border-color var(--transition-fast); }
        .kd-note-editor:focus { border-color: var(--accent); }
        .kd-action-row { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; }
        .kd-shortcut-hint { font-size: 12px; color: var(--text-tertiary); }
        .kd-save-btn { background: var(--accent); color: white; border: none; border-radius: 8px; padding: 10px 20px; font-size: var(--text-sm); font-weight: 500; cursor: pointer; transition: all var(--transition-fast); min-width: 120px; }
        .kd-save-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .kd-save-btn.saved { background: #2ec4b6; }
        .kd-save-btn.saving { opacity: 0.7; }
        .kd-attachments-section { padding: 12px 0; border-top: 1px solid var(--border); margin-top: 12px; }
        .kd-attachments-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .kd-attachments-title { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); }
        .kd-attachments-add-btn { font-size: var(--text-xs); font-weight: 500; color: var(--accent); cursor: pointer; padding: 4px 8px; border-radius: 4px; background: var(--bg-card-hover); transition: background 0.2s; }
        .kd-attachments-add-btn:hover { background: var(--divider); }
        .kd-attachments-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .kd-attachment-card { position: relative; width: 64px; height: 64px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border); }
        .kd-attachment-thumb { width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: transform 0.2s; }
        .kd-attachment-thumb:hover { transform: scale(1.05); }
        .kd-attachment-delete { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0, 0, 0, 0.6); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity 0.2s; }
        .kd-attachment-card:hover .kd-attachment-delete { opacity: 1; }
        .kd-attachment-delete:hover { background: var(--priority-high); }
        .kd-attachments-placeholder { display: flex; align-items: center; justify-content: center; padding: 12px; border: 1.5px dashed var(--border); border-radius: 8px; color: var(--text-tertiary); font-size: var(--text-xs); background: rgba(255, 255, 255, 0.015); text-align: center; }
      `}</style>
    </div>
  );
};
export default KnowledgeDetail;
