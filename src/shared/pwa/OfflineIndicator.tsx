import { useState, useEffect } from 'react';
import { runSync } from '@/utils/syncQueue';

interface SyncResult {
  success: number;
  failed: number;
}

// Component hien thi banner thong bao trang thai mang Online/Offline
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      setSyncResult(null);

      // Chay dong bo hoa du lieu hang doi
      try {
        const result = await runSync();
        setSyncResult(result);
        setShowResult(true);
        // An thong bao ket qua sau 4 giay
        setTimeout(() => setShowResult(false), 4000);
      } catch (err) {
        console.error('[OfflineIndicator] Loi dong bo:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncResult(null);
      setShowResult(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dang online va khong co thong bao gi - khong hien thi gi ca
  if (isOnline && !isSyncing && !showResult) return null;

  return (
    <div
      className={`offline-indicator ${isOnline ? 'online' : 'offline'} ${isSyncing ? 'syncing' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="offline-indicator__icon">
        {!isOnline && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
        )}
        {isSyncing && (
          <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-3.01"/>
          </svg>
        )}
        {isOnline && showResult && !isSyncing && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>

      <span className="offline-indicator__text">
        {!isOnline && 'Dang ngoai tuyen - cac thay doi se duoc luu lai'}
        {isSyncing && 'Dang dong bo du lieu...'}
        {isOnline && showResult && !isSyncing && syncResult && (
          syncResult.success > 0
            ? `Da dong bo ${syncResult.success} thay doi thanh cong`
            : 'Da ket noi lai mang'
        )}
      </span>

      <style>{`
        .offline-indicator {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 500;
          z-index: 9999;
          box-shadow: 0 4px 24px rgba(0,0,0,0.35);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          border: 1px solid;
          letter-spacing: -0.01em;
        }
        .offline-indicator.offline {
          background: rgba(242, 95, 92, 0.15);
          border-color: rgba(242, 95, 92, 0.4);
          color: #f25f5c;
        }
        .offline-indicator.online.syncing {
          background: rgba(76, 201, 240, 0.15);
          border-color: rgba(76, 201, 240, 0.4);
          color: #4cc9f0;
        }
        .offline-indicator.online:not(.syncing) {
          background: rgba(46, 196, 182, 0.15);
          border-color: rgba(46, 196, 182, 0.4);
          color: #2ec4b6;
        }
        .offline-indicator__icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
