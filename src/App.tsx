import React, { useState } from 'react';
import { TaskProvider, useTaskContext } from './contexts/TaskContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { WebhookProvider, useWebhookContext } from './contexts/WebhookContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import Sidebar from './components/layout/Sidebar';
import TaskList from './components/task/TaskList';
import TaskPanel from './components/layout/TaskPanel';
import KnowledgeHub from './components/knowledge/KnowledgeHub';
import AddProjectDialog from './components/common/AddProjectDialog';
import AddFolderDialog from './components/common/AddFolderDialog';
import AddTagDialog from './components/common/AddTagDialog';
import ReportPage from './components/report/ReportPage';
import PomodoroWidget from './components/pomodoro/PomodoroWidget';
import PomodoroModal from './components/pomodoro/PomodoroModal';
import HeaderActions from './components/layout/HeaderActions';
import CommandPalette from './components/common/CommandPalette';
import { useReminderCheck } from './hooks/useReminderCheck';
import { useAppRouter } from './hooks/useAppRouter';
import './styles/index.css';

// Inner app - co the truy cap vao AppContext
const AppInner: React.FC = () => {
  const { openModal, settings } = useAppContext();
  const { tasks, activeView, activeProjectId, setActiveView, setActiveProjectId } = useTaskContext();
  const [showReport, setShowReport] = useState(false);
  // Mobile: sidebar is an off-canvas drawer toggled by the hamburger button.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);
  const handleSidebarNavigate = () => {
    closeMobileNav();
    setShowReport(false);
  };

  // Webhook integration (shared event log via WebhookProvider)
  const { onTaskReminded } = useWebhookContext();

  // Reminder checker
  useReminderCheck({
    tasks,
    webhookEnabled: settings.webhookEnabled,
    onTaskReminded,
  });

  // URL Sub Routing sync
  useAppRouter({
    activeView,
    activeProjectId,
    showReport,
    setActiveView,
    setActiveProjectId,
    setShowReport
  });

  const handleShowReport = () => setShowReport((v) => !v);

  return (
    <div className={`app-layout ${(activeView === 'knowledge' || showReport) ? 'panel-hidden' : ''} ${mobileNavOpen ? 'sidebar-open' : ''}`}>
      {/* Mobile-only hamburger to open the sidebar drawer */}
      <button
        type="button"
        className="mobile-menu-btn"
        aria-label="Mở menu"
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Mobile drawer backdrop (tap to close) */}
      <div className="mobile-backdrop" onClick={closeMobileNav} aria-hidden="true" />

      {/* Header Actions (Top Right) */}
      <HeaderActions onShowReport={handleShowReport} />

      {/* Left sidebar */}
      <Sidebar onNavigate={handleSidebarNavigate} />

      {/* Main content */}
      <main className="main-content">
        {showReport ? (
          <ReportPage onClose={handleShowReport} />
        ) : activeView === 'knowledge' ? (
          <KnowledgeHub />
        ) : (
          <TaskList />
        )}
      </main>

      {/* Right panel — luôn hiển thị (trừ knowledge/report): new task form hoặc task detail */}
      {activeView !== 'knowledge' && !showReport && <TaskPanel />}

      {/* Command palette (Ctrl/Cmd+K) + quick-capture */}
      <CommandPalette onToggleReport={handleShowReport} />

      {/* Dialogs */}
      <AddProjectDialog />
      <AddFolderDialog />
      <AddTagDialog />

      {/* Pomodoro widget & modal */}
      <PomodoroWidget />
      <PomodoroModal />

      {/* Settings - lazy */}
      {openModal === 'settings' && (
        <React.Suspense fallback={null}>
          <SettingsDialogLazy />
        </React.Suspense>
      )}

      <style>{`
      `}</style>
    </div>
  );
};

// Lazy load settings dialog de giam bundle initial
const SettingsDialogLazy = React.lazy(
  () => import('./components/settings/SettingsDialog')
);

const App: React.FC = () => (
  <AppProvider>
    <WebhookProvider>
      <TaskProvider>
        <PomodoroProvider>
          <AppInner />
        </PomodoroProvider>
      </TaskProvider>
    </WebhookProvider>
  </AppProvider>
);

export default App;
