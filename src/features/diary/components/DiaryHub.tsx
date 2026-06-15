import React, { useState, useEffect } from 'react';
import { useDiaryContext } from '@/features/diary/DiaryContext';
import DiaryList from '@/features/diary/components/DiaryList';
import DiaryDetail from '@/features/diary/components/DiaryDetail';
import '../diary.css';

const DiaryHub: React.FC = () => {
  const { diaries, addDiary, setSelectedDiaryId, selectedDiaryId } = useDiaryContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpenMobile, setDetailOpenMobile] = useState(false);

  const selectNote = (id: string | null) => {
    setSelectedId(id);
    setSelectedDiaryId(id);
  };

  // Sync selectedId with selectedDiaryId from context
  useEffect(() => {
    if (selectedDiaryId !== selectedId) {
      setSelectedId(selectedDiaryId);
      if (selectedDiaryId) {
        setDetailOpenMobile(true);
      }
    }
  }, [selectedDiaryId, selectedId]);

  // Tu dong chon nhat ky dau tien neu chua chon gi
  useEffect(() => {
    if (diaries.length > 0 && !selectedDiaryId) {
      selectNote(diaries[0].id);
    } else if (diaries.length === 0) {
      selectNote(null);
    }
  }, [diaries, selectedDiaryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dam bao selectedId hop le
  const currentDiary = diaries.find((d) => d.id === selectedId);
  const activeDiary = currentDiary || (diaries.length > 0 ? diaries[0] : null);

  const handleAddDiary = () => {
    const today = new Date();
    const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const newNote = addDiary(`Nhật ký ngày ${dateStr}`, null, 'none');
    if (newNote) {
      selectNote(newNote.id);
      setDetailOpenMobile(true);
    }
  };

  return (
    <div className="knowledge-hub-layout">
      {/* Cot trai: Danh sach nhat ky */}
      <div className="kh-sidebar-pane">
        <DiaryList
          diaries={diaries}
          selectedId={activeDiary ? activeDiary.id : null}
          onSelect={(id) => { selectNote(id); setDetailOpenMobile(true); }}
          onAdd={handleAddDiary}
        />
      </div>

      {/* Cot phai: Editor va Preview */}
      <div className={`kh-detail-pane${detailOpenMobile ? ' is-open' : ''}`}>
        {activeDiary ? (
          <DiaryDetail
            diary={activeDiary}
            onClose={() => setDetailOpenMobile(false)}
          />
        ) : (
          <div className="kh-welcome-screen">
            <div className="kh-welcome-card">
              <div className="kh-welcome-icon-wrap" style={{ background: 'rgba(244, 162, 97, 0.12)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="kh-welcome-title">Nhật ký công việc</h3>
              <p className="kh-welcome-subtitle">
                Lưu trữ và ghi lại tiến trình làm việc hàng ngày của bạn. Ghi nhận thành quả, bài học rút ra, cảm nhận và mục tiêu cho ngày mai.
              </p>
              <button className="kh-welcome-btn" onClick={handleAddDiary}>
                Viết nhật ký đầu tiên
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryHub;
