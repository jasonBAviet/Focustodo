import React, { useState, useEffect } from 'react';
import { useLearningContext } from '../LearningContext';
import type { VocabularyItem, SentenceItem } from '@/types';

interface LearningDetailProps {
  item: VocabularyItem | SentenceItem;
  type: 'vocab' | 'sentence';
  onClose?: () => void;
}

const LearningDetail: React.FC<LearningDetailProps> = ({ item, type, onClose }) => {
  const { markItemLearnedStatus } = useLearningContext();
  const [showFlipped, setShowFlipped] = useState(false);

  // Tự động ẩn đáp án khi đổi từ/câu mới
  useEffect(() => {
    setShowFlipped(false);
  }, [item.id]);

  const handleToggleLearned = async () => {
    const nextStatus = item.status === 'learned' ? 'unlearned' : 'learned';
    await markItemLearnedStatus(item.id, type, nextStatus);
  };

  const isVocab = type === 'vocab';
  const vocab = item as VocabularyItem;
  const sentence = item as SentenceItem;

  return (
    <div className="learning-detail-container">
      {/* Header chi tiết */}
      <div className="ld-header">
        <button className="ld-close-btn" onClick={onClose} aria-label="Đóng">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="ld-header-title">Chi tiết nội dung học</span>
      </div>

      <div className="ld-content">
        {/* Hộp Flashcard / Nội dung chính */}
        {item.status === 'learned' ? (
          /* CHẾ ĐỘ KIỂM TRA (FLASHCARD) */
          <div className="ld-flashcard-box">
            <div className="ld-fc-badge">Chế độ ôn tập Flashcard</div>
            <div className="ld-fc-main-card">
              <div className="ld-fc-front">
                {isVocab ? (
                  <>
                    <h2 className="ld-main-word">{vocab.word}</h2>
                    <p className="ld-main-ipa">{vocab.ipa}</p>
                    <p className="ld-main-type">{vocab.type}</p>
                    {vocab.context && (
                      <div className="ld-fc-context">
                        <strong>Ngữ cảnh:</strong>
                        <p>"{vocab.context}"</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="ld-main-en">"{sentence.en}"</h3>
                    {sentence.point && (
                      <p className="ld-main-point">
                        <strong>Lưu ý:</strong> {sentence.point}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Phần đáp án lật ra */}
              <div className={`ld-fc-back ${showFlipped ? 'visible' : ''}`}>
                <div className="divider-line" />
                <h3 className="ld-fc-meaning-title">Đáp án nghĩa tiếng Việt:</h3>
                <p className="ld-fc-meaning">
                  {isVocab ? vocab.meaning : sentence.vi}
                </p>
                {isVocab && vocab.explanation && (
                  <div className="ld-fc-explanation">
                    <strong>Giải thích chi tiết:</strong>
                    <p>{vocab.explanation}</p>
                  </div>
                )}
              </div>
            </div>

            <button 
              className={`ld-flip-btn ${showFlipped ? 'flipped' : ''}`}
              onClick={() => setShowFlipped(prev => !prev)}
            >
              {showFlipped ? 'Ẩn nghĩa tiếng Việt' : 'Xem nghĩa tiếng Việt (Lật thẻ)'}
            </button>
          </div>
        ) : (
          /* CHẾ ĐỘ HỌC TẬP THƯỜNG */
          <div className="ld-study-box">
            {isVocab ? (
              <>
                <div className="ld-card">
                  <span className="ld-card-type">{vocab.type}</span>
                  <h2 className="ld-main-word">{vocab.word}</h2>
                  <p className="ld-main-ipa">{vocab.ipa}</p>
                  
                  <div className="ld-section">
                    <h4 className="ld-section-title">Nghĩa tiếng Việt</h4>
                    <p className="ld-section-value highlight">{vocab.meaning}</p>
                  </div>
                </div>

                {vocab.context && (
                  <div className="ld-card">
                    <h4 className="ld-section-title">Ngữ cảnh sử dụng (Context)</h4>
                    <p className="ld-section-value italic">"{vocab.context}"</p>
                  </div>
                )}

                {vocab.explanation && (
                  <div className="ld-card">
                    <h4 className="ld-section-title">Giải thích chi tiết</h4>
                    <p className="ld-section-value">{vocab.explanation}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="ld-card">
                  <h4 className="ld-section-title">Câu tiếng Anh</h4>
                  <h3 className="ld-main-en">"{sentence.en}"</h3>
                </div>

                <div className="ld-card">
                  <h4 className="ld-section-title">Bản dịch tiếng Việt</h4>
                  <p className="ld-section-value highlight">{sentence.vi}</p>
                </div>

                {sentence.point && (
                  <div className="ld-card">
                    <h4 className="ld-section-title">Điểm ngữ pháp cần lưu ý</h4>
                    <p className="ld-section-value">{sentence.point}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Nguồn Video */}
        <div className="ld-card ld-source-card">
          <h4 className="ld-section-title">Nguồn video học tập</h4>
          <div className="ld-video-info">
            <div className="ld-video-meta-row">
              <span className="ld-video-label">Topic:</span>
              <span className="ld-video-val">{item.topic}</span>
            </div>
            {item.domain && (
              <div className="ld-video-meta-row">
                <span className="ld-video-label">Domain:</span>
                <span className="ld-video-val">{item.domain}</span>
              </div>
            )}
            {item.videoUrl && (
              <a 
                href={item.videoUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ld-video-link"
              >
                Xem Video nguồn trên YouTube ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Footer chứa nút chuyển trạng thái học tập */}
      <div className="ld-footer">
        <button 
          className={`ld-action-btn ${item.status === 'learned' ? 'unmark' : 'mark'}`}
          onClick={handleToggleLearned}
        >
          {item.status === 'learned' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
              </svg>
              Đánh dấu chưa thuộc (Quay lại Học tập)
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Đã thuộc (Chuyển sang Kiểm tra)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LearningDetail;
