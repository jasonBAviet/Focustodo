import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Component hien thi goi y cai dat ung dung vao man hinh chinh
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Kiem tra xem nguoi dung da tu choi goi y chua
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Hien thi goi y sau 30 giay de khong lam phien nguoi dung ngay
      setTimeout(() => setIsVisible(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Nguoi dung chon:', outcome);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="install-prompt" role="dialog" aria-label="Goi y cai dat ung dung">
      <div className="install-prompt__icon">
        <svg width="28" height="28" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="192" height="192" rx="42" fill="#f25f5c" opacity="0.2"/>
          <circle cx="96" cy="96" r="52" fill="none" stroke="#f25f5c" stroke-width="8"/>
          <line x1="96" y1="96" x2="96" y2="56" stroke="#f0f0f5" stroke-width="8" stroke-linecap="round"/>
          <line x1="96" y1="96" x2="120" y2="110" stroke="#f25f5c" stroke-width="8" stroke-linecap="round"/>
          <circle cx="96" cy="96" r="8" fill="#f25f5c"/>
        </svg>
      </div>
      <div className="install-prompt__content">
        <p className="install-prompt__title">Cai dat Focus Todo</p>
        <p className="install-prompt__desc">Them vao man hinh chinh de truy cap nhanh hon</p>
      </div>
      <div className="install-prompt__actions">
        <button className="install-prompt__btn install" onClick={handleInstall}>
          Cai dat
        </button>
        <button className="install-prompt__btn dismiss" onClick={handleDismiss}>
          De sau
        </button>
      </div>

      <style>{`
        .install-prompt {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: var(--bg-card, #252530);
          border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          z-index: 9998;
          min-width: 300px;
          max-width: 360px;
          animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(16px);
        }
        .install-prompt__icon {
          flex-shrink: 0;
        }
        .install-prompt__content {
          flex: 1;
          min-width: 0;
        }
        .install-prompt__title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #f0f0f5);
          margin: 0 0 2px;
        }
        .install-prompt__desc {
          font-size: 12px;
          color: var(--text-secondary, #9090a8);
          margin: 0;
        }
        .install-prompt__actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
        }
        .install-prompt__btn {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: opacity 0.15s ease;
          white-space: nowrap;
        }
        .install-prompt__btn:hover { opacity: 0.85; }
        .install-prompt__btn.install {
          background: #f25f5c;
          color: #fff;
        }
        .install-prompt__btn.dismiss {
          background: transparent;
          color: var(--text-secondary, #9090a8);
          border: 1px solid var(--border, rgba(255,255,255,0.07));
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
