import React, { useState } from 'react';
import { TaskProvider, useTaskContext } from './contexts/TaskContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { WebhookProvider, useWebhookContext } from './contexts/WebhookContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import Sidebar from './components/layout/Sidebar';
import TaskList from './components/task/TaskList';
import TaskPanel from './components/layout/TaskPanel';
import AddProjectDialog from './components/common/AddProjectDialog';
import AddFolderDialog from './components/common/AddFolderDialog';
import AddTagDialog from './components/common/AddTagDialog';
import ReportPage from './components/report/ReportPage';
import PomodoroWidget from './components/pomodoro/PomodoroWidget';
import PomodoroModal from './components/pomodoro/PomodoroModal';
import HeaderActions from './components/layout/HeaderActions';
import { useReminderCheck } from './hooks/useReminderCheck';
import { useAppRouter } from './hooks/useAppRouter';
import './styles/index.css';

// Inner app - co the truy cap vao AppContext
const AppInner: React.FC = () => {
  const { openModal, settings } = useAppContext();
  const { selectedTaskId, tasks, activeView, activeProjectId, setActiveView, setActiveProjectId } = useTaskContext();
  const [showReport, setShowReport] = useState(false);

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
    <div className={`app-layout ${!selectedTaskId ? 'panel-hidden' : ''}`}>
      {/* Header Actions (Top Right) */}
      <HeaderActions onShowReport={handleShowReport} />

      {/* Left sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="main-content">
        {showReport ? (
          <ReportPage onClose={handleShowReport} />
        ) : (
          <>
            <TaskList />
          </>
        )}
      </main>

      {/* Right panel (task detail) */}
      {selectedTaskId && <TaskPanel />}

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
