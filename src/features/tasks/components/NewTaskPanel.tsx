import React from 'react';

interface NewTaskPanelProps {
  onClose?: () => void;
}

const NewTaskPanel: React.FC<NewTaskPanelProps> = ({ onClose }) => {
  return (
    <div className="new-task-empty-panel animate-fade-in">
      <div className="task-panel-header">
        <span className="panel-new-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
        <h2 className="task-panel-title">Thêm công việc</h2>
        {onClose && (
          <div className="task-panel-header-actions">
            <button className="icon-btn" onClick={onClose} title="Đóng">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="new-task-empty-body">
        <div className="empty-illustration">
          <div className="pulse-glow" />
          <svg className="empty-svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="16" y="10" width="32" height="44" rx="6" stroke="var(--text-tertiary)" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M24 20h16M24 28h16M24 36h10" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            <circle cx="44" cy="44" r="10" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
            <path d="M44 40v8M40 44h8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="empty-title">Đang đợi nhập tên công việc</h3>
        <p className="empty-desc">
          Hãy nhập tên công việc ở thanh nhập liệu và nhấn Enter để lưu. Sau đó, bạn có thể tiếp tục bổ sung các thông tin chi tiết tại đây.
        </p>
      </div>

      <style>{`
        .new-task-empty-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .new-task-empty-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-8) var(--space-6);
          text-align: center;
        }
        .empty-illustration {
          position: relative;
          margin-bottom: var(--space-6);
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .empty-svg {
          position: relative;
          z-index: 2;
        }
        .pulse-glow {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--accent-soft);
          opacity: 0.35;
          z-index: 1;
          animation: pulse-ring 2.5s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.65); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.15; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        .empty-title {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-3);
        }
        .empty-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 280px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default NewTaskPanel;
