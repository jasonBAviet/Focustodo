import React, { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useDiaryContext } from '@/features/diary/DiaryContext';
import type { Diary, Task } from '@/types';
import TagPicker from '@/features/tasks/components/TagPicker';
import { formatDiaryContent } from '../utils/diary-formatter';
import Lightbox from '@/shared/components/Lightbox';
interface DiaryDetailProps {
  diary: Diary;
  onClose?: () => void;
}
const DiaryDetail: React.FC<DiaryDetailProps> = ({ diary, onClose }) => {
  const { projects, tags, addTag, attachments, addAttachment, deleteAttachment, tasks } = useTaskContext();
  const { updateDiary } = useDiaryContext();
  const [title, setTitle] = useState(diary.title);
  const [note, setNote] = useState(diary.note);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  // State cho Autocomplete gợi ý Task
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [atIndex, setAtIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setTitle(diary.title);
    setNote(diary.note);
    setSaveStatus('idle');
    setShowSuggestions(false);
  }, [diary.id]);

  const handleSave = () => {
    setSaveStatus('saving');
    updateDiary(diary.id, {
      title: title.trim() || 'Nhật ký công việc chưa có tiêu đề',
      note,
    });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    updateDiary(diary.id, { note: val });

    const cursor = e.target.selectionStart;
    const textBefore = val.substring(0, cursor);
    
    // Tim tu cuoi cung truoc con tro
    const words = textBefore.split(/[\s\n]/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const q = lastWord.substring(1);
      setSuggestQuery(q);
      setShowSuggestions(true);
      setSuggestIndex(0);
      setAtIndex(cursor - lastWord.length);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertTaskLink = (task: Task) => {
    if (!textareaRef.current) return;
    const val = note;
    const start = atIndex;
    const end = textareaRef.current.selectionStart;

    const linkText = `[${task.title}](task://${task.id})`;
    const newVal = val.substring(0, start) + linkText + val.substring(end);
    
    setNote(newVal);
    updateDiary(diary.id, { note: newVal });
    setShowSuggestions(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = start + linkText.length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 0);
  };

  const activeTasks = tasks.filter(t => !t.completed && t.projectId === diary.projectId);
  const eligibleTasks = tasks.filter(t => 
    (t.id === diary.taskId) || (!t.completed && t.projectId === diary.projectId)
  );
  const filteredTasks = activeTasks.filter(t => 
    t.title.toLowerCase().includes(suggestQuery.toLowerCase())
  ).slice(0, 5); // Toi da 5 goi y

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredTasks.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestIndex(prev => (prev + 1) % filteredTasks.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestIndex(prev => (prev - 1 + filteredTasks.length) % filteredTasks.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertTaskLink(filteredTasks[suggestIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      return;
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
        taskId: diary.id,
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
            taskId: diary.id,
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

  const selectedProject = projects.find((p) => p.id === diary.projectId);
  const diaryAttachments = (attachments || []).filter((a) => a.taskId === diary.id);

  return (
    <div className="knowledge-detail-container" onKeyDown={handleKeyDown} onPaste={handlePaste}>
      <div className="kd-header">
        <span className="kd-header-title">Chi tiết nhật ký</span>
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
          placeholder="Nhập tiêu đề nhật ký..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
                value={diary.projectId || ''}
                onChange={(e) => {
                  updateDiary(diary.id, { projectId: e.target.value || null });
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

          <div className="kd-meta-item">
            <span className="kd-meta-label">Công việc</span>
            <div className="kd-project-select-wrap">
              <select
                className="kd-meta-select"
                value={diary.taskId || ''}
                onChange={(e) => {
                  updateDiary(diary.id, { taskId: e.target.value || null });
                  setSaveStatus('saved');
                  setTimeout(() => setSaveStatus('idle'), 2000);
                }}
                style={{ maxWidth: '160px' }}
              >
                <option value="">Không liên kết</option>
                {eligibleTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="kd-meta-item col-span-2">
            <span className="kd-meta-label">Thẻ (Tags)</span>
            <TagPicker
              taskTags={diary.tags || []}
              allTags={tags}
              onUpdate={(tagIds) => {
                updateDiary(diary.id, { tags: tagIds });
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
              }}
              onAddTag={addTag}
            />
          </div>
        </div>

        <div className="kd-body-section" style={{ position: 'relative' }}>
          <div className="kd-tabs-row">
            <button
              type="button"
              className={`kd-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
              onClick={() => setActiveTab('edit')}
            >
              Biên tập
            </button>
            <button
              type="button"
              className={`kd-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Xem trước
            </button>
          </div>

          {activeTab === 'edit' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '150px' }}>
              <textarea
                ref={textareaRef}
                className="kd-note-editor"
                placeholder="Viết nội dung nhật ký ở đây... (Gõ @ để liên kết với công việc)"
                value={note}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay de click suggestion duoc truoc
                autoFocus
              />

              {/* Autocomplete Suggestions Overlay */}
              {showSuggestions && filteredTasks.length > 0 && (
                <div className="diary-suggestions-menu">
                  <div style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                    LIÊN KẾT VỚI CÔNG VIỆC:
                  </div>
                  {filteredTasks.map((t, idx) => {
                    const isSelected = idx === suggestIndex;
                    const getPColor = (p: string) => {
                      if (p === 'high') return '#f25f5c';
                      if (p === 'medium') return '#f4a261';
                      if (p === 'low') return '#2ec4b6';
                      return '#888';
                    };
                    return (
                      <div
                        key={t.id}
                        onClick={() => insertTaskLink(t)}
                        className={`diary-suggestion-item${isSelected ? ' is-selected' : ''}`}
                        onMouseEnter={() => setSuggestIndex(idx)}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getPColor(t.priority) }} />
                        <span className="truncate" style={{ flex: 1 }}>{t.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="kd-note-preview" style={{ flex: 1, minHeight: '150px', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '8px', overflowY: 'auto', background: 'var(--bg-card)' }}>
              {formatDiaryContent(note)}
            </div>
          )}

          {/* Hinh anh dinh kem */}
          <div className="kd-attachments-section">
            <div className="kd-attachments-header">
              <span className="kd-attachments-title">Hình ảnh đính kèm</span>
              <label className="kd-attachments-add-btn">
                {uploading ? 'Đang tải...' : 'Thêm ảnh'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
              </label>
            </div>
            {diaryAttachments.length > 0 ? (
              <div className="kd-attachments-grid">
                {diaryAttachments.map((a) => (
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
            <span className="kd-shortcut-hint">Mẹo: Nhấn Ctrl+Enter để lưu · Gõ @ để tag task</span>
            <button 
              className={`kd-save-btn ${saveStatus}`}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Đang lưu...' : saveStatus === 'saved' ? 'Đã lưu ✓' : 'Lưu nhật ký'}
            </button>
          </div>
        </div>
      </div>

      <Lightbox isOpen={lightboxOpen} imageUrl={lightboxImg} onClose={() => setLightboxOpen(false)} />
    </div>
  );
};

export default DiaryDetail;
