import React, { useState, useEffect } from 'react';
import { useLearningContext } from '../LearningContext';
import LearningList from './LearningList';
import LearningDetail from './LearningDetail';
import './learning.css';

const LearningHub: React.FC = () => {
  const { 
    vocabularyList, 
    sentencesList, 
    selectedItemId, 
    selectedItemType, 
    setSelectedItemId, 
    setSelectedItemType 
  } = useLearningContext();

  const [detailOpenMobile, setDetailOpenMobile] = useState(false);

  // Gộp tất cả các từ vựng và mẫu câu để dễ tìm kiếm phần tử hiện tại
  const currentItem = React.useMemo(() => {
    if (!selectedItemId) return null;
    if (selectedItemType === 'vocab') {
      return vocabularyList.find(v => v.id === selectedItemId) || null;
    } else {
      return sentencesList.find(s => s.id === selectedItemId) || null;
    }
  }, [selectedItemId, selectedItemType, vocabularyList, sentencesList]);

  // Tự động chọn phần tử đầu tiên khi load dữ liệu nếu chưa chọn gì
  useEffect(() => {
    if (!selectedItemId) {
      if (vocabularyList.length > 0) {
        setSelectedItemId(vocabularyList[0].id);
        setSelectedItemType('vocab');
      } else if (sentencesList.length > 0) {
        setSelectedItemId(sentencesList[0].id);
        setSelectedItemType('sentence');
      }
    }
  }, [vocabularyList, sentencesList, selectedItemId, setSelectedItemId, setSelectedItemType]);

  const handleSelect = (id: string, type: 'vocab' | 'sentence') => {
    setSelectedItemId(id);
    setSelectedItemType(type);
    setDetailOpenMobile(true);
  };

  const hasData = vocabularyList.length > 0 || sentencesList.length > 0;

  return (
    <div className="learning-hub-layout">
      {/* Cột trái: Danh sách và Bộ lọc */}
      <div className="lh-sidebar-pane">
        <LearningList
          selectedId={selectedItemId}
          onSelect={handleSelect}
        />
      </div>

      {/* Cột phải: Chi tiết phần tử học tập */}
      <div className={`lh-detail-pane ${detailOpenMobile ? 'is-open' : ''}`}>
        {currentItem ? (
          <LearningDetail
            item={currentItem}
            type={selectedItemType}
            onClose={() => setDetailOpenMobile(false)}
          />
        ) : (
          <div className="lh-welcome-screen">
            <div className="lh-welcome-card">
              <div className="lh-welcome-icon-wrap">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="lh-welcome-title">Learning English</h3>
              <p className="lh-welcome-subtitle">
                {hasData 
                  ? 'Hãy chọn một từ vựng hoặc mẫu câu từ danh sách bên trái để bắt đầu học và kiểm tra.' 
                  : 'Hiện tại chưa có dữ liệu học tập được đồng bộ từ video. Hãy đảm bảo bạn đã chạy quá trình dịch thuật trên hệ thống.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningHub;
