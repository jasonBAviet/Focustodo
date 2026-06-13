import React, { useState, useEffect } from 'react';
import { TaskProvider, useTaskContext } from '@/features/tasks/TaskContext';
import { AppProvider, useAppContext } from '@/core/contexts/AppContext';
import { WebhookProvider, useWebhookContext } from '@/core/contexts/WebhookContext';
import { PomodoroProvider } from '@/features/pomodoro/PomodoroContext';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import AuthScreen from '@/features/auth/components/AuthScreen';
import Sidebar from '@/shared/layout/Sidebar';
import TaskList from '@/features/tasks/components/TaskList';
import TaskPanel from '@/shared/layout/TaskPanel';
import KnowledgeHub from '@/features/knowledge/components/KnowledgeHub';
import AddProjectDialog from '@/shared/components/AddProjectDialog';
import AddFolderDialog from '@/shared/components/AddFolderDialog';
import AddTagDialog from '@/shared/components/AddTagDialog';
import ReportPage from '@/features/reports/components/ReportPage';
import PomodoroWidget from '@/features/pomodoro/components/PomodoroWidget';
import PomodoroModal from '@/features/pomodoro/components/PomodoroModal';
import HeaderActions from '@/shared/layout/HeaderActions';
import CommandPalette from '@/shared/components/CommandPalette';
import OfflineIndicator from '@/shared/pwa/OfflineIndicator';
import InstallPrompt from '@/shared/pwa/InstallPrompt';
import { useReminderCheck } from '@/shared/hooks/useReminderCheck';
import { useAppRouter } from '@/shared/hooks/useAppRouter';
import { useSwipeGesture } from '@/shared/hooks/useSwipeGesture';
import { isNativeMobile } from '@/utils/capacitorConfig';
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

  // Cu chi vuot de mo/dong sidebar tren thiet bi cam ung
  useSwipeGesture({
    isSidebarOpen: mobileNavOpen,
    onSwipeRight: () => setMobileNavOpen(true),
    onSwipeLeft: () => setMobileNavOpen(false),
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

      {/* Cac component PWA: hien thi trang thai mang va goi y cai dat */}
      <OfflineIndicator />
      <InstallPrompt />

      {openModal === 'settings' && (
        <React.Suspense fallback={null}>
          <SettingsDialogLazy />
        </React.Suspense>
      )}
    </div>
  );
};

const SettingsDialogLazy = React.lazy(
  () => import('@/features/settings/components/SettingsDialog')
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

const App: React.FC = () => {
  // Gan class 'capacitor-native' vao the <html> khi chay trong Capacitor
  // de kich hoat cac quy tac CSS safe-area va tuy chinh native
  useEffect(() => {
    if (isNativeMobile()) {
      document.documentElement.classList.add('capacitor-native');
    }
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
