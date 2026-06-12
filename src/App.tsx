import React, { useState } from 'react';
import { TaskProvider, useTaskContext } from './contexts/TaskContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { WebhookProvider, useWebhookContext } from './contexts/WebhookContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
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

const AppInner: React.FC = () => {
  const { openModal, settings } = useAppContext();
  const { tasks, activeView, activeProjectId, setActiveView, setActiveProjectId } = useTaskContext();
  const [showReport, setShowReport] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);
  const handleSidebarNavigate = () => {
    closeMobileNav();
    setShowReport(false);
  };

  const { onTaskReminded } = useWebhookContext();

  useReminderCheck({
    tasks,
    webhookEnabled: settings.webhookEnabled,
    onTaskReminded,
  });

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

      <div className="mobile-backdrop" onClick={closeMobileNav} aria-hidden="true" />
      <HeaderActions onShowReport={handleShowReport} />
      <Sidebar onNavigate={handleSidebarNavigate} />

      <main className="main-content">
        {showReport ? (
          <ReportPage onClose={handleShowReport} />
        ) : activeView === 'knowledge' ? (
          <KnowledgeHub />
        ) : (
          <TaskList />
        )}
      </main>

      {activeView !== 'knowledge' && !showReport && <TaskPanel />}

      <CommandPalette onToggleReport={handleShowReport} />

      <AddProjectDialog />
      <AddFolderDialog />
      <AddTagDialog />

      <PomodoroWidget />
      <PomodoroModal />

      {openModal === 'settings' && (
        <React.Suspense fallback={null}>
          <SettingsDialogLazy />
        </React.Suspense>
      )}
    </div>
  );
};

const SettingsDialogLazy = React.lazy(
  () => import('./components/settings/SettingsDialog')
);

const AppContent: React.FC = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <style>{`
          .app-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #0c0d14;
          }
          .spinner {
            width: 45px;
            height: 45px;
            border: 4px solid rgba(255, 255, 255, 0.05);
            border-left-color: #4361ee;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!token) {
    return <AuthScreen />;
  }

  return (
    <WebhookProvider>
      <TaskProvider>
        <PomodoroProvider>
          <AppInner />
        </PomodoroProvider>
      </TaskProvider>
    </WebhookProvider>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </AuthProvider>
);

export default App;
