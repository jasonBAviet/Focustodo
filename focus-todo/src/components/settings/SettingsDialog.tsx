// ============================================================
// FOCUS TO-DO - SettingsDialog
// Dialog Settings chinh - layout 2 cot: sidebar tabs + content
// ============================================================
import React, { useState } from 'react';
import Dialog from '../common/Dialog';
import { useAppContext } from '../../contexts/AppContext';
import AppearanceSettings from './AppearanceSettings';
import PomodoroTimerSettings from './PomodoroTimerSettings';
import ProjectsSettings from './ProjectsSettings';
import WebhookSettings from './WebhookSettings';
import GeneralSettings from './GeneralSettings';

// ----------------------------------------------------------
// Kieu du lieu Tab
// ----------------------------------------------------------
type TabId = 'account' | 'general' | 'pomodoro' | 'projects' | 'appearance' | 'webhook';

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// ----------------------------------------------------------
// Icon SVG nho gon cho tung tab
// ----------------------------------------------------------
const IconAccount = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconGeneral = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.41 1.41M11.37 11.37l1.41 1.41M11.37 4.63l1.41-1.41M3.22 12.78l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconPomodoro = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 4.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconProjects = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconAppearance = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 2a6 6 0 0 1 0 12V2Z" fill="currentColor" opacity="0.3" />
  </svg>
);

const IconWebhook = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6 3a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 13a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM10 13a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 5v1.5L5 10M8 5v1.5L11 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ----------------------------------------------------------
// Danh sach Tab
// ----------------------------------------------------------
const TABS: TabItem[] = [
  { id: 'account',    label: 'Account',       icon: <IconAccount /> },
  { id: 'general',   label: 'General',        icon: <IconGeneral /> },
  { id: 'pomodoro',  label: 'Pomodoro Timer', icon: <IconPomodoro /> },
  { id: 'projects',  label: 'Projects',       icon: <IconProjects /> },
  { id: 'appearance',label: 'Appearance',     icon: <IconAppearance /> },
  { id: 'webhook',   label: 'Webhook',        icon: <IconWebhook /> },
];

// ----------------------------------------------------------
// Tab Account - placeholder don gian
// ----------------------------------------------------------
const AccountSettings: React.FC = () => (
  <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', padding: '8px 0' }}>
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Focus To-Do</div>
      <div>Phien ban: 1.0.0</div>
    </div>
    <div style={{ color: 'var(--text-muted)' }}>Tinh nang Account se co trong phien ban tiep theo.</div>
  </div>
);

// ----------------------------------------------------------
// Render noi dung tuong ung voi tab
// ----------------------------------------------------------
function renderTabContent(tab: TabId): React.ReactNode {
  switch (tab) {
    case 'account':    return <AccountSettings />;
    case 'general':    return <GeneralSettings />;
    case 'pomodoro':   return <PomodoroTimerSettings />;
    case 'projects':   return <ProjectsSettings />;
    case 'appearance': return <AppearanceSettings />;
    case 'webhook':    return <WebhookSettings />;
    default:           return null;
  }
}

// ----------------------------------------------------------
// Component chinh
// ----------------------------------------------------------
const SettingsDialog: React.FC = () => {
  const { openModal, setOpenModal } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const handleClose = () => setOpenModal(null);

  return (
    <>
      <style>{`
        .settings-dialog-inner {
          display: flex;
          min-height: 480px;
          max-height: 75vh;
        }
        .settings-sidebar {
          width: 180px;
          flex-shrink: 0;
          border-right: 1px solid var(--divider);
          padding: 8px 0;
          overflow-y: auto;
        }
        .settings-tab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 16px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: var(--text-sm);
          cursor: pointer;
          text-align: left;
          border-radius: 0;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .settings-tab-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .settings-tab-btn.active {
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 600;
        }
        .settings-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
        }
        .settings-content-title {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 16px 0;
        }
      `}</style>

      <Dialog
        isOpen={openModal === 'settings'}
        onClose={handleClose}
        title="Settings"
        width="lg"
      >
        <div className="settings-dialog-inner">
          {/* Sidebar tabs */}
          <nav className="settings-sidebar" aria-label="Settings tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`settings-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-selected={activeTab === tab.id}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Content area */}
          <div className="settings-content">
            <h3 className="settings-content-title">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            {renderTabContent(activeTab)}
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default SettingsDialog;
