import React, { useState, useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useDiaryContext } from '@/features/diary/DiaryContext';
import type { Diary } from '@/types';

interface DiaryListProps {
  diaries: Diary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const DiaryList: React.FC<DiaryListProps> = ({
  diaries,
  selectedId,
  onSelect,
  onAdd,
}) => {
  const { projects, tags, folders } = useTaskContext();
  const { deleteDiary } = useDiaryContext();
  const [search, setSearch] = useState('');
  const [selectedProj, setSelectedProj] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  // Loc danh sach nhat ky theo bo loc
  const filteredList = useMemo(() => {
    return diaries.filter((item) => {
      // 1. Loc theo tu khoa
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inNote = (item.note || '').toLowerCase().includes(q);
        if (!inTitle && !inNote) return false;
      }

      // 2. Loc theo Project
      if (selectedProj !== 'all') {
        if (item.projectId !== selectedProj) return false;
      }

      // 3. Loc theo Tag
      if (selectedTag !== 'all') {
        if (!item.tags || !item.tags.includes(selectedTag)) return false;
      }

      // 4. Loc theo Folder
      if (selectedFolder !== 'all') {
        const folder = folders.find(f => f.id === selectedFolder);
        if (!folder) return false;
        if (!item.projectId) return false;
        const project = projects.find(p => p.id === item.projectId);
        if (!project || project.folderId !== selectedFolder) return false;
      }

      return true;
    });
  }, [diaries, search, selectedProj, selectedTag, selectedFolder, folders, projects]);

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return '';
    }
  };

  // Rut ngan note de hien snippet chu thuan (khong hien thi markdown syntax de dep hon)
  const getNoteSnippet = (noteText: string) => {
    if (!noteText) return '';
    // Xoa bot markdown headers, link task:// de lay text tron
    return noteText
      .replace(/###/g, '')
      .replace(/\[([^\]]+)\]\(task:\/\/[^)]+\)/g, '$1')
      .replace(/[-*#`]/g, '')
      .trim();
  };

  return (
    <div className="knowledge-list-container">
      {/* Header va Nut them moi */}
      <div className="kl-header">
        <h2 className="kl-title">Nhật ký công việc</h2>
        <button className="kl-add-btn" onClick={onAdd} title="Viết nhật ký mới">
          + Viết nhật ký
        </button>
      </div>

      {/* Bo loc */}
      <div className="kl-filters-pane">
        <input
          type="text"
          className="kl-search-input"
          placeholder="Tìm tiêu đề, nội dung..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        <div className="kl-dropdowns-row">
          <select 
            value={selectedProj} 
            onChange={(e) => setSelectedProj(e.target.value)}
            className="kl-filter-select"
          >
            <option value="all">Tất cả dự án</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select 
            value={selectedTag} 
            onChange={(e) => setSelectedTag(e.target.value)}
            className="kl-filter-select"
          >
            <option value="all">Tất cả thẻ</option>
            {tags.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select 
            value={selectedFolder} 
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="kl-filter-select"
          >
            <option value="all">Tất cả thư mục</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Danh sach items */}
      <div className="kl-items-list">
        {filteredList.length === 0 ? (
          <div className="kl-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Không tìm thấy nhật ký công việc nào</p>
          </div>
        ) : (
          filteredList.map((item) => {
            const proj = projects.find(p => p.id === item.projectId);
            const itemTags = tags.filter(t => (item.tags || []).includes(t.id));
            const isActive = item.id === selectedId;

            return (
              <div
                key={item.id}
                className={`kl-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <div className="kl-item-header">
                  <h3 className="kl-item-title truncate">{item.title || 'Nhật ký chưa có tiêu đề'}</h3>
                  <button
                    className="kl-delete-item-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDiary(item.id);
                    }}
                    title="Xóa nhật ký"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                
                {item.note && (
                  <p className="kl-item-snippet truncate-2">
                    {getNoteSnippet(item.note)}
                  </p>
                )}

                <div className="kl-item-meta">
                  {proj && (
                    <span className="kl-meta-badge" style={{ borderColor: proj.color }}>
                      <span className="kl-meta-badge-dot" style={{ background: proj.color }} />
                      {proj.name}
                    </span>
                  )}
                  {itemTags.map(t => (
                    <span key={t.id} className="kl-meta-tag" style={{ color: t.color }}>
                      #{t.name}
                    </span>
                  ))}
                  <div style={{ flex: 1 }} />
                  <span className="kl-item-date">{formatDate(item.updatedAt || item.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DiaryList;
