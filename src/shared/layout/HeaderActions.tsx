import React from 'react';
import { useAppContext } from '@/core/contexts/AppContext';
import { useAuth } from '@/features/auth/AuthContext';

const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
  </svg>
);

const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
  </svg>
);

const IconSun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const IconMoon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
  </svg>
);

interface HeaderActionsProps {
  onShowReport: () => void;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ onShowReport }) => {
  const { setOpenModal, isDark, updateSettings } = useAppContext();
  const { user } = useAuth();

  const toggleTheme = () => {
    updateSettings({ darkMode: isDark ? 'light' : 'dark' });
  };

  return (
    <div className="header-actions">
      {user && <span className="user-email-display">{user.email}</span>}
      <button className="ha-btn" title="Report" onClick={onShowReport}><IconChart /></button>
      <button className="ha-btn" title="Notifications"><IconBell /></button>
      <button
        className="ha-btn"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={toggleTheme}
      >
        {isDark ? <IconSun /> : <IconMoon />}
      </button>
      <button className="ha-btn" title="Settings" onClick={() => setOpenModal('settings')}><IconSettings /></button>

      <style>{`
        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          position: absolute;
          top: var(--space-6);
          right: var(--space-8);
          z-index: 100;
        }
        .user-email-display {
          display: inline-block;
          min-width: 0;
          max-width: 140px;
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          margin-right: var(--space-2);
          background: var(--glass-bg);
          padding: var(--space-1) var(--space-2-5);
          border-radius: var(--radius-full);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: middle;
        }
        @media (max-width: 768px) {
          .user-email-display { display: none; }
          .ha-btn { padding: 6px; }
          .header-actions { gap: 2px !important; }
        }
        .ha-btn {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-1-5);
          border-radius: 50%;
          transition: all var(--transition-fast);
        }
        .ha-btn:hover {
          color: var(--text-primary);
          background: var(--bg-card-hover);
        }
      `}</style>
    </div>
  );
};

export default HeaderActions;
