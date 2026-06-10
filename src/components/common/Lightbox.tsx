import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface LightboxProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ isOpen, imageUrl, onClose }) => {
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !imageUrl) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const lightboxContent = (
    <>
      <style>{`
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          z-index: 1100;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          animation: fade-in var(--transition-normal) both;
        }
        .lightbox-container {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: dialog-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .lightbox-image {
          max-width: 100%;
          max-height: 85vh;
          object-fit: contain;
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: var(--shadow-lg);
        }
        .lightbox-close-btn {
          position: absolute;
          top: -40px;
          right: 0;
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .lightbox-close-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.1);
        }
      `}</style>
      <div className="lightbox-overlay" onClick={handleOverlayClick}>
        <div className="lightbox-container">
          <button
            type="button"
            className="lightbox-close-btn"
            onClick={onClose}
            aria-label="Dong anh phong to"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <img src={imageUrl} alt="Phong to" className="lightbox-image" />
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(lightboxContent, document.body);
};

export default Lightbox;
