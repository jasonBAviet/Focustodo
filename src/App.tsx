import React, { useState, useEffect } from 'react';
import { TaskProvider, useTaskContext } from '@/features/tasks/TaskContext';
import { AppProvider, useAppContext } from '@/core/contexts/AppContext';
import { WebhookProvider, useWebhookContext } from '@/core/contexts/WebhookContext';
import { PomodoroProvider } from '@/features/pomodoro/PomodoroContext';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { KnowledgeProvider } from '@/features/knowledge/KnowledgeContext';
import { DiaryProvider } from '@/features/diary/DiaryContext';
// import AuthScreen from '@/features/auth/components/AuthScreen'; // temporarily disabled
import Sidebar from '@/shared/layout/Sidebar';
import TaskList from '@/features/tasks/components/TaskList';
import TaskPanel from '@/shared/layout/TaskPanel';
import KnowledgeHub from '@/features/knowledge/components/KnowledgeHub';
import DiaryHub from '@/features/diary/components/DiaryHub';
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
  const { openModal, settings, viewMode, setViewMode } = useAppContext();
  const { tasks, activeView, activeProjectId, setActiveView, setActiveProjectId, selectedTaskId, newTaskPanelOpen } = useTaskContext();
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
    viewMode,
    setActiveView,
    setActiveProjectId,
    setShowReport,
    setViewMode,
  });

  // Swipe gesture to open/close sidebar on touch devices
  useSwipeGesture({
    isSidebarOpen: mobileNavOpen,
    onSwipeRight: () => setMobileNavOpen(true),
    onSwipeLeft: () => setMobileNavOpen(false),
  });

  const handleShowReport = () => setShowReport((v) => !v);

  const panelVisible = !showReport && activeView !== 'knowledge' && viewMode !== 'kg' && (!!selectedTaskId || newTaskPanelOpen);

  return (
    <div className={`app-layout ${!panelVisible ? 'panel-hidden' : ''} ${mobileNavOpen ? 'sidebar-open' : ''}`}>
      <button
        type="button"
        className="mobile-menu-btn"
        aria-label="Open menu"
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
        ) : activeView === 'diary' ? (
          <DiaryHub />
        ) : (
          <TaskList />
        )}
      </main>

      {activeView !== 'knowledge' && viewMode !== 'kg' && !showReport && <TaskPanel />}

      <CommandPalette onToggleReport={handleShowReport} />

      <AddProjectDialog />
      <AddFolderDialog />
      <AddTagDialog />

      <PomodoroWidget />
      <PomodoroModal />

      {/* PWA components: show network status and install prompt */}
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
  // ---- AUTH TEMPORARILY DISABLED: removed AuthScreen, keep loading to wait for token ----
  const { loading } = useAuth();
  // if (!token) return <AuthScreen />; // temporarily disabled

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0c0d14' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.05)', borderLeftColor: '#4361ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <WebhookProvider>
      <TaskProvider>
        <PomodoroProvider>
          <KnowledgeProvider>
            <DiaryProvider>
              <AppInner />
            </DiaryProvider>
          </KnowledgeProvider>
        </PomodoroProvider>
      </TaskProvider>
    </WebhookProvider>
  );
};

const App: React.FC = () => {
  // Add 'capacitor-native' class to <html> tag when running in Capacitor
  // to enable safe-area CSS rules and native customizations
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
