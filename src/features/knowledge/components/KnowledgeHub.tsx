import React, { useState, useEffect } from 'react';
import { useKnowledgeContext } from '@/features/knowledge/KnowledgeContext';
import KnowledgeList from '@/features/knowledge/components/KnowledgeList';
import KnowledgeDetail from '@/features/knowledge/components/KnowledgeDetail';

const KnowledgeHub: React.FC = () => {
  const { knowledges, addKnowledge, updateKnowledge, setSelectedKnowledgeId } = useKnowledgeContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Mobile master-detail: the detail pane is a slide-over shown only after the
  // user taps a note (on desktop this flag is inert — no effect outside the
  // mobile media query).
  const [detailOpenMobile, setDetailOpenMobile] = useState(false);

  // Keeps both local state and context in sync so siblings can read selectedKnowledgeId
  const selectNote = (id: string | null) => {
    setSelectedId(id);
    setSelectedKnowledgeId(id);
  };

  // Tự động chọn ghi chú đầu tiên nếu chưa chọn gì
  useEffect(() => {
    if (knowledges.length > 0 && !selectedId) {
      selectNote(knowledges[0].id);
    } else if (knowledges.length === 0) {
      selectNote(null);
    }
  }, [knowledges, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đảm bảo selectedId hợp lệ (nếu item bị xoá)
  const currentKnowledge = knowledges.find((k) => k.id === selectedId);
  const activeKnowledge = currentKnowledge || (knowledges.length > 0 ? knowledges[0] : null);

  const handleAddKnowledge = () => {
    const template = `Kết luận:

Luận điểm chính:
•
•
•

Dẫn chứng:
- `;
    const newNote = addKnowledge('Ghi chú kiến thức mới', null, 'none');
    if (newNote) {
      updateKnowledge(newNote.id, { note: template });
      selectNote(newNote.id);
      setDetailOpenMobile(true);
    }
  };

  return (
    <div className="knowledge-hub-layout">
      {/* Cột trái: Danh sách kiến thức & Bộ lọc */}
      <div className="kh-sidebar-pane">
        <KnowledgeList
          knowledges={knowledges}
          selectedId={activeKnowledge ? activeKnowledge.id : null}
          onSelect={(id) => { selectNote(id); setDetailOpenMobile(true); }}
          onAdd={handleAddKnowledge}
        />
      </div>

      {/* Cột phải: Chi tiết biên tập và xem trước */}
      <div className={`kh-detail-pane${detailOpenMobile ? ' is-open' : ''}`}>
        {activeKnowledge ? (
          <KnowledgeDetail
            knowledge={activeKnowledge}
            onClose={() => setDetailOpenMobile(false)}
          />
        ) : (
          <div className="kh-welcome-screen">
            <div className="kh-welcome-card">
              <div className="kh-welcome-icon-wrap">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="kh-welcome-title">Knowledge Hub</h3>
              <p className="kh-welcome-subtitle">
                Chào mừng bạn đến với Hub kiến thức của dự án. Lưu trữ và phân loại các ghi chú, wiki công việc của bạn tại đây.
              </p>
              <button className="kh-welcome-btn" onClick={handleAddKnowledge}>
                Tạo ghi chú đầu tiên
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .knowledge-hub-layout {
          display: flex;
          height: 100vh;
          width: 100%;
          overflow: hidden;
          background: var(--bg-main);
        }
        .kh-sidebar-pane {
          width: 380px;
          min-width: 320px;
          max-width: 450px;
          height: 100%;
          flex-shrink: 0;
        }
        .kh-detail-pane {
          flex: 1;
          height: 100%;
          overflow: hidden;
        }
        .kh-welcome-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: var(--bg-card);
          padding: 40px;
          text-align: center;
        }
        .kh-welcome-card {
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 30px;
          border-radius: 16px;
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-md);
        }
        .kh-welcome-icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--accent) 10%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kh-welcome-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        .kh-welcome-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }
        .kh-welcome-btn {
          background: var(--accent);
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: opacity var(--transition-fast);
          margin-top: 8px;
        }
        .kh-welcome-btn:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default KnowledgeHub;
