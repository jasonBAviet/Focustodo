import React, { useState, useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useKnowledgeContext } from '@/features/knowledge/KnowledgeContext';
import type { Knowledge } from '@/types';

interface KnowledgeListProps {
  knowledges: Knowledge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const KnowledgeList: React.FC<KnowledgeListProps> = ({
  knowledges,
  selectedId,
  onSelect,
  onAdd,
}) => {
  const { projects, tags, folders } = useTaskContext();
  const { deleteKnowledge } = useKnowledgeContext();
  const [search, setSearch] = useState('');
  const [selectedProj, setSelectedProj] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  // Lọc danh sách kiến thức cục bộ theo các bộ lọc đã chọn
  const filteredList = useMemo(() => {
    return knowledges.filter((item) => {
      // 1. Lọc theo từ khóa
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inNote = (item.note || '').toLowerCase().includes(q);
        if (!inTitle && !inNote) return false;
      }

      // 2. Lọc theo Project
      if (selectedProj !== 'all') {
        if (item.projectId !== selectedProj) return false;
      }

      // 3. Lọc theo Tag
      if (selectedTag !== 'all') {
        if (!item.tags || !item.tags.includes(selectedTag)) return false;
      }

      // 4. Lọc theo Folder
      if (selectedFolder !== 'all') {
        // Tìm các dự án thuộc thư mục này
        const folder = folders.find(f => f.id === selectedFolder);
        if (!folder) return false;
        // Kiểm tra xem project của item có thuộc folder này không
        if (!item.projectId) return false;
        const project = projects.find(p => p.id === item.projectId);
        if (!project || project.folderId !== selectedFolder) return false;
      }

      return true;
    });
  }, [knowledges, search, selectedProj, selectedTag, selectedFolder, folders, projects]);

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="knowledge-list-container">
      {/* Header và Nút thêm mới */}
      <div className="kl-header">
        <h2 className="kl-title">Kho Kiến thức</h2>
        <button className="kl-add-btn" onClick={onAdd}>
          + Thêm kiến thức
        </button>
      </div>

      {/* Bộ lọc xịn mịn */}
      <div className="kl-filters-pane">
        <input
          type="text"
          className="kl-search-input"
          placeholder="Tìm tiêu đề, nội dung..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        <div className="kl-dropdowns-row">
          {/* Dự án Filter */}
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

          {/* Thẻ Filter */}
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

          {/* Thư mục Filter */}
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

      {/* Danh sách items */}
      <div className="kl-items-list">
        {filteredList.length === 0 ? (
          <div className="kl-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Không tìm thấy ghi chú kiến thức nào</p>
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
                  <h3 className="kl-item-title truncate">{item.title || 'Ghi chú chưa có tiêu đề'}</h3>
                  <button
                    className="kl-delete-item-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteKnowledge(item.id);
                    }}
                    title="Xóa kiến thức"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                
                {item.note && (
                  <p className="kl-item-snippet truncate-2">
                    {item.note}
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

      <style>{`
        .knowledge-list-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-right: 1px solid var(--border);
          background: var(--bg-card);
        }
        .kl-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }
        .kl-title {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        .kl-add-btn {
          background: var(--accent);
          color: white;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: var(--text-xs);
          font-weight: 500;
          cursor: pointer;
          transition: opacity var(--transition-fast);
        }
        .kl-add-btn:hover {
          opacity: 0.9;
        }
        .kl-filters-pane {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.01);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .kl-search-input {
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: var(--text-sm);
          outline: none;
          transition: border-color var(--transition-fast);
        }
        .kl-search-input:focus {
          border-color: var(--accent);
        }
        .kl-dropdowns-row {
          display: flex;
          gap: 8px;
        }
        .kl-filter-select {
          flex: 1;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 6px;
          color: var(--text-secondary);
          font-size: 11px;
          outline: none;
          cursor: pointer;
        }
        .kl-filter-select option {
          background: var(--bg-dialog);
          color: var(--text-primary);
        }
        .kl-items-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .kl-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-tertiary);
          font-size: var(--text-sm);
          text-align: center;
          gap: 10px;
        }
        .kl-item {
          padding: 14px 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.01);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .kl-item:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-strong);
        }
        .kl-item.active {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 5%, var(--bg-card));
          box-shadow: var(--shadow-sm);
        }
        .kl-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
        }
        .kl-item-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          flex: 1;
        }
        .kl-delete-item-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }
        .kl-item:hover .kl-delete-item-btn {
          opacity: 1;
        }
        .kl-delete-item-btn:hover {
          background: rgba(242, 95, 92, 0.15);
          color: var(--priority-high);
        }
        .kl-item-snippet {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }
        .truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .kl-item-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }
        .kl-meta-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1px 6px;
        }
        .kl-meta-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }
        .kl-meta-tag {
          font-size: 11px;
          font-weight: 500;
        }
        .kl-item-date {
          font-size: 10px;
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};

export default KnowledgeList;
