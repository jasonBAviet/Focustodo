import React, { useState, useMemo } from 'react';
import { useLearningContext } from '../LearningContext';

interface LearningListProps {
  selectedId: string | null;
  onSelect: (id: string, type: 'vocab' | 'sentence') => void;
}

const LearningList: React.FC<LearningListProps> = ({ selectedId, onSelect }) => {
  const { vocabularyList, sentencesList, loading, markItemLearnedStatus, toggleItemHardStatus } = useLearningContext();
  const [search, setSearch] = useState('');
  const [filterHard, setFilterHard] = useState(false);

  const handleQuickStatusToggle = async (
    e: React.MouseEvent,
    itemId: string,
    itemType: 'vocab' | 'sentence',
    currentStatus: 'learned' | 'unlearned'
  ) => {
    e.stopPropagation();
    const nextStatus = currentStatus === 'learned' ? 'unlearned' : 'learned';
    await markItemLearnedStatus(itemId, itemType, nextStatus);
  };

  const handleToggleHard = async (
    e: React.MouseEvent,
    itemId: string,
    itemType: 'vocab' | 'sentence',
    currentIsHard: boolean
  ) => {
    e.stopPropagation();
    await toggleItemHardStatus(itemId, itemType, !currentIsHard);
  };
  
  // Tab lớn: 'study' (Chưa học) | 'test' (Đã học / Kiểm tra)
  const [mainTab, setMainTab] = useState<'study' | 'test'>('study');
  
  // Tab con: 'vocab' (Từ vựng) | 'sentence' (Mẫu câu)
  const [subTab, setSubTab] = useState<'vocab' | 'sentence'>('vocab');

  // Trạng thái sắp xếp
  const [sortBy, setSortBy] = useState<'alpha' | 'date'>('alpha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (type: 'alpha' | 'date') => {
    if (sortBy === type) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(type);
      setSortOrder('asc');
    }
  };

  // Lọc và sắp xếp từ vựng
  const filteredVocab = useMemo(() => {
    const targetStatus = mainTab === 'study' ? 'unlearned' : 'learned';
    const filtered = vocabularyList.filter((item) => {
      const matchStatus = item.status === targetStatus;
      const matchHard = !filterHard || item.isHard;
      const matchSearch =
        item.word.toLowerCase().includes(search.toLowerCase()) ||
        item.meaning.toLowerCase().includes(search.toLowerCase()) ||
        item.topic.toLowerCase().includes(search.toLowerCase()) ||
        (item.domain && item.domain.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchHard && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'alpha') {
        comparison = a.word.localeCompare(b.word, 'vi', { sensitivity: 'base' });
      } else if (sortBy === 'date') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [vocabularyList, mainTab, search, sortBy, sortOrder, filterHard]);

  // Lọc và sắp xếp mẫu câu
  const filteredSentences = useMemo(() => {
    const targetStatus = mainTab === 'study' ? 'unlearned' : 'learned';
    const filtered = sentencesList.filter((item) => {
      const matchStatus = item.status === targetStatus;
      const matchHard = !filterHard || item.isHard;
      const matchSearch =
        item.en.toLowerCase().includes(search.toLowerCase()) ||
        item.vi.toLowerCase().includes(search.toLowerCase()) ||
        item.topic.toLowerCase().includes(search.toLowerCase()) ||
        (item.domain && item.domain.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchHard && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'alpha') {
        comparison = a.en.localeCompare(b.en, 'en', { sensitivity: 'base' });
      } else if (sortBy === 'date') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [sentencesList, mainTab, search, sortBy, sortOrder, filterHard]);

  if (loading && vocabularyList.length === 0 && sentencesList.length === 0) {
    return (
      <div className="learning-list-loading">
        <div className="spinner" />
        <span>Đang tải dữ liệu học tập...</span>
      </div>
    );
  }

  return (
    <div className="learning-list-container">
      {/* Tìm kiếm */}
      <div className="ll-search-box">
        <input
          type="text"
          placeholder="Tìm từ vựng, mẫu câu, chủ đề..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="clear-btn" onClick={() => setSearch('')}>
            &times;
          </button>
        )}
      </div>

      {/* Tab lớn: Học tập / Kiểm tra */}
      <div className="ll-main-tabs">
        <button
          className={`tab-btn ${mainTab === 'study' ? 'active' : ''}`}
          onClick={() => setMainTab('study')}
        >
          Học tập
          <span className="badge-count count-study">
            {vocabularyList.filter(v => v.status === 'unlearned').length + 
             sentencesList.filter(s => s.status === 'unlearned').length}
          </span>
        </button>
        <button
          className={`tab-btn ${mainTab === 'test' ? 'active' : ''}`}
          onClick={() => setMainTab('test')}
        >
          Kiểm tra
          <span className="badge-count count-test">
            {vocabularyList.filter(v => v.status === 'learned').length + 
             sentencesList.filter(s => s.status === 'learned').length}
          </span>
        </button>
      </div>

      {/* Tab con: Từ vựng / Mẫu câu */}
      <div className="ll-sub-tabs">
        <button
          className={`sub-tab-btn ${subTab === 'vocab' ? 'active' : ''}`}
          onClick={() => setSubTab('vocab')}
        >
          Từ vựng ({filteredVocab.length})
        </button>
        <button
          className={`sub-tab-btn ${subTab === 'sentence' ? 'active' : ''}`}
          onClick={() => setSubTab('sentence')}
        >
          Mẫu câu ({filteredSentences.length})
        </button>
      </div>

      {/* Thanh sắp xếp */}
      <div className="ll-sort-bar">
        <span className="ll-sort-label">Bộ lọc:</span>
        <button
          className={`ll-filter-hard-btn ${filterHard ? 'active' : ''}`}
          onClick={() => setFilterHard(!filterHard)}
          title="Chỉ hiển thị các từ khó cần ôn lại"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={filterHard ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Cần ôn lại
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

        <span className="ll-sort-label">Sắp xếp:</span>
        <div className="ll-sort-options">
          <button
            className={`ll-sort-btn ${sortBy === 'alpha' ? 'active' : ''}`}
            onClick={() => handleSort('alpha')}
          >
            Tên (ABC) {sortBy === 'alpha' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`ll-sort-btn ${sortBy === 'date' ? 'active' : ''}`}
            onClick={() => handleSort('date')}
          >
            Ngày tạo {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Danh sách hiển thị */}
      <div className="ll-list-content">
        {subTab === 'vocab' ? (
          filteredVocab.length === 0 ? (
            <div className="ll-empty-state">Không có từ vựng nào phù hợp.</div>
          ) : (
            filteredVocab.map((item) => (
              <div
                key={item.id}
                className={`ll-item ${selectedId === item.id ? 'selected' : ''}`}
                onClick={() => onSelect(item.id, 'vocab')}
              >
                <div className="ll-item-main-info">
                  <div className="ll-item-header">
                    <span className="ll-item-word">{item.word}</span>
                    <span className="ll-item-type">{item.type}</span>
                  </div>
                  <div className="ll-item-ipa">{item.ipa}</div>
                  <div className="ll-item-meaning truncate">
                    {mainTab === 'test' ? (
                      <span className="ll-item-hidden-hint">Đã thuộc - Nhấp để ôn tập</span>
                    ) : (
                      item.meaning
                    )}
                  </div>
                  <div className="ll-item-footer">
                    <span className="ll-item-tag">{item.topic}</span>
                    {item.domain && <span className="ll-item-tag">{item.domain}</span>}
                  </div>
                </div>

                <div className="ll-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`ll-difficulty-btn ${item.isHard ? 'active' : ''}`}
                    onClick={(e) => handleToggleHard(e, item.id, 'vocab', !!item.isHard)}
                    title={item.isHard ? 'Bỏ đánh dấu từ khó' : 'Đánh dấu từ khó cần ôn lại'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={item.isHard ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>

                  <button
                    className={`ll-quick-action-btn ${item.status === 'learned' ? 'active' : ''}`}
                    onClick={(e) => handleQuickStatusToggle(e, item.id, 'vocab', item.status)}
                    title={item.status === 'learned' ? 'Đánh dấu chưa thuộc' : 'Đánh dấu đã thuộc'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          filteredSentences.length === 0 ? (
            <div className="ll-empty-state">Không có mẫu câu nào phù hợp.</div>
          ) : (
            filteredSentences.map((item) => (
              <div
                key={item.id}
                className={`ll-item ${selectedId === item.id ? 'selected' : ''}`}
                onClick={() => onSelect(item.id, 'sentence')}
              >
                <div className="ll-item-main-info">
                  <div className="ll-item-en text-ellipsis">{item.en}</div>
                  <div className="ll-item-vi text-ellipsis">
                    {mainTab === 'test' ? (
                      <span className="ll-item-hidden-hint">Đã thuộc - Nhấp để ôn tập</span>
                    ) : (
                      item.vi
                    )}
                  </div>
                  <div className="ll-item-footer" style={{ marginTop: '8px' }}>
                    <span className="ll-item-tag">{item.topic}</span>
                    {item.point && <span className="ll-item-point truncate">{item.point}</span>}
                  </div>
                </div>

                <div className="ll-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`ll-difficulty-btn ${item.isHard ? 'active' : ''}`}
                    onClick={(e) => handleToggleHard(e, item.id, 'sentence', !!item.isHard)}
                    title={item.isHard ? 'Bỏ đánh dấu câu khó' : 'Đánh dấu câu khó cần ôn lại'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={item.isHard ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>

                  <button
                    className={`ll-quick-action-btn ${item.status === 'learned' ? 'active' : ''}`}
                    onClick={(e) => handleQuickStatusToggle(e, item.id, 'sentence', item.status)}
                    title={item.status === 'learned' ? 'Đánh dấu chưa thuộc' : 'Đánh dấu đã thuộc'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default LearningList;
