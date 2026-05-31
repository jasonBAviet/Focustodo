import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

// ============================================================
// DIALOG / MODAL COMPONENT
// ============================================================

export type DialogWidth = 'sm' | 'md' | 'lg';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: DialogWidth;
  showClose?: boolean;
}

const WIDTH_MAP: Record<DialogWidth, string> = {
  sm: '380px',
  md: '520px',
  lg: '680px',
};

const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'md',
  showClose = true,
}) => {
  // Ngan scroll body khi open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  // Close khi nhan ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showClose) {
        onClose();
      }
    },
    [onClose, showClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && showClose) {
      onClose();
    }
  };

  const dialogContent = (
    <>
      <style>{`
        .dialog-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: var(--bg-overlay);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          animation: fade-in var(--transition-normal) both;
        }
        .dialog-box {
          background: var(--bg-dialog);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          width: 100%;
          animation: dialog-in 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--divider);
          flex-shrink: 0;
        }
        .dialog-title {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
        }
        .dialog-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast), color var(--transition-fast);
          flex-shrink: 0;
        }
        .dialog-close-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .dialog-body {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-5);
        }
      `}</style>
      <div className="dialog-overlay" onClick={handleOverlayClick}>
        <div
          className="dialog-box"
          style={{ maxWidth: WIDTH_MAP[width] }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showClose) && (
            <div className="dialog-header">
              {title && <h2 className="dialog-title">{title}</h2>}
              {showClose && (
                <button
                  type="button"
                  className="dialog-close-btn"
                  onClick={onClose}
                  aria-label="Dong dialog"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M12 4L4 12M4 4l8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className="dialog-body">{children}</div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(dialogContent, document.body);
};

export default Dialog;
