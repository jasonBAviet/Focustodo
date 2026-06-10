import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import type { Task } from '../../types';
import TagPicker from '../task/TagPicker';

interface KnowledgeDetailProps {
  knowledge: Task;
  onClose?: () => void;
}

const KnowledgeDetail: React.FC<KnowledgeDetailProps> = ({ knowledge, onClose }) => {
  const { updateTask, projects, tags, addTag } = useTaskContext();
  const [title, setTitle] = useState(knowledge.title);
  const [note, setNote] = useState(knowledge.note);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
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

    // Cập nhật giá trị vào DB
    updateTask(knowledge.id, { note: newNote });

    // Đưa con trỏ chuột về vị trí thích hợp
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

  // Cho phép lưu nhanh bằng Ctrl + Enter hoặc Cmd + Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  // Xử lý các phím tắt định dạng trong Textarea
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl + Enter để lưu
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      return;
    }
    // Ctrl + B cho bôi đậm
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertFormatting('**', '**');
      return;
    }
    // Ctrl + I cho in nghiêng
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertFormatting('*', '*');
      return;
    }
  };

  // Nhấn Enter ở ô tiêu đề thì lưu và chuyển xuống ô ghi chú
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      // Chuyển focus xuống textarea
      const textarea = document.querySelector('.kd-note-editor') as HTMLTextAreaElement;
      if (textarea) textarea.focus();
    }
  };

  const selectedProject = projects.find((p) => p.id === knowledge.projectId);

  return (
    <div className="knowledge-detail-container" onKeyDown={handleKeyDown}>
      {/* Header toolbar */}
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
        {/* Title input */}
        <input
          type="text"
          className="kd-title-input"
          placeholder="Nhập tiêu đề kiến thức..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          onBlur={handleSave}
        />

        {/* Project & Tag row */}
        <div className="kd-metadata-grid">
          <div className="kd-meta-item">
            <span className="kd-meta-label">Dự án</span>
            <div className="kd-project-select-wrap">
              {selectedProject && (
                <span 
                  className="kd-project-dot" 
                  style={{ backgroundColor: selectedProject.color }} 
                />
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

        {/* Note Editor */}
        <div className="kd-body-section">
          <textarea
            className="kd-note-editor"
            placeholder="Viết nội dung kiến thức ở đây... (Cấu trúc sẵn Kim Tự Tháp: Kết luận -> Luận điểm -> Dẫn chứng)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            onBlur={handleSave}
            rows={14}
            autoFocus
          />
          
          {/* Nút lưu ở dưới box text */}
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

      <style>{`
        .knowledge-detail-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-card);
          border-left: 1px solid var(--border);
        }
        .kd-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.02);
        }
        .kd-header-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-secondary);
        }
        .kd-delete-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kd-delete-btn:hover {
          background: var(--bg-card-hover);
          color: var(--priority-high);
        }
        .kd-close-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
        }
        .kd-close-btn:hover {
          color: var(--text-primary);
        }
        .kd-content-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .kd-title-input {
          width: 100%;
          background: none;
          border: none;
          border-bottom: 1.5px solid transparent;
          color: var(--text-primary);
          font-size: 22px;
          font-weight: 600;
          outline: none;
          padding-bottom: 6px;
          transition: border-color var(--transition-fast);
        }
        .kd-title-input:focus {
          border-color: var(--accent);
        }
        .kd-metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          background: rgba(255, 255, 255, 0.015);
          padding: 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .kd-meta-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .kd-meta-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
        }
        .kd-project-select-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 8px;
        }
        .kd-project-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .kd-meta-select {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 13px;
          cursor: pointer;
        }
        .kd-meta-select option {
          background: var(--bg-dialog);
        }
        .kd-body-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .kd-note-editor {
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px 16px;
          color: var(--text-primary);
          font-size: 14px;
          line-height: 1.6;
          font-family: var(--font-main);
          resize: vertical;
          outline: none;
          transition: border-color var(--transition-fast);
        }
        .kd-note-editor:focus {
          border-color: var(--accent);
        }
        .kd-action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
        }
        .kd-shortcut-hint {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        .kd-save-btn {
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          min-width: 120px;
        }
        .kd-save-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .kd-save-btn.saved {
          background: #2ec4b6;
        }
        .kd-save-btn.saving {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

export default KnowledgeDetail;
