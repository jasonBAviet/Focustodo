// ============================================================
// FOCUS TO-DO - SettingsDialog
// Main Settings Dialog - 2 col layout: sidebar tabs + content
// ============================================================
import React, { useState } from 'react';
import Dialog from '@/shared/components/Dialog';
import { useAppContext } from '@/core/contexts/AppContext';
import AppearanceSettings from '@/features/settings/components/AppearanceSettings';
import PomodoroTimerSettings from '@/features/settings/components/PomodoroTimerSettings';
import ProjectsAndFoldersSettings from '@/features/settings/components/ProjectsAndFoldersSettings';
import TagsSettings from '@/features/settings/components/TagsSettings';
import WebhookSettings from '@/features/settings/components/WebhookSettings';
import GeneralSettings from '@/features/settings/components/GeneralSettings';
import AccountSettings from '@/features/settings/components/AccountSettings';

// ----------------------------------------------------------
// Tab data type
// ----------------------------------------------------------
type TabId = 'account' | 'general' | 'pomodoro' | 'projects' | 'tags' | 'appearance' | 'webhook';

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// ----------------------------------------------------------
// Compact SVG icon for each tab
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

import { IconPomodoro } from '@/shared/components/IconPomodoro';

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

const IconTags = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.41l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.41zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
  </svg>
);

// ----------------------------------------------------------
// Tab list
// ----------------------------------------------------------
const TABS: TabItem[] = [
  { id: 'account', label: 'Account', icon: <IconAccount /> },
  { id: 'general', label: 'General', icon: <IconGeneral /> },
  { id: 'pomodoro', label: 'Pomodoro Timer', icon: <IconPomodoro /> },
  { id: 'projects', label: 'Projects & Folders', icon: <IconProjects /> },
  { id: 'tags', label: 'Tags', icon: <IconTags /> },
  { id: 'appearance', label: 'Appearance', icon: <IconAppearance /> },
  { id: 'webhook', label: 'Webhook', icon: <IconWebhook /> },
];

// ----------------------------------------------------------
// Render corresponding tab content
// ----------------------------------------------------------
function renderTabContent(tab: TabId): React.ReactNode {
  switch (tab) {
    case 'account': return <AccountSettings />;
    case 'general': return <GeneralSettings />;
    case 'pomodoro': return <PomodoroTimerSettings />;
    case 'projects': return <ProjectsAndFoldersSettings />;
    case 'tags': return <TagsSettings />;
    case 'appearance': return <AppearanceSettings />;
    case 'webhook': return <WebhookSettings />;
    default: return null;
  }
}

// ----------------------------------------------------------
// Main component
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
          height: 540px;
          max-height: 70vh;
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
