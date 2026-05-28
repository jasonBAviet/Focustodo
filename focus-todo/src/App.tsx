import React, { useState } from 'react';
import { TaskProvider, useTaskContext } from './contexts/TaskContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import Sidebar from './components/layout/Sidebar';
import TaskList from './components/task/TaskList';
import TaskPanel from './components/layout/TaskPanel';
import AddProjectDialog from './components/common/AddProjectDialog';
import AddFolderDialog from './components/common/AddFolderDialog';
import AddTagDialog from './components/common/AddTagDialog';
import ReportPage from './components/report/ReportPage';
import PomodoroWidget from './components/pomodoro/PomodoroWidget';
import HeaderActions from './components/layout/HeaderActions';
import useWebhook from './hooks/useWebhook';
import { useReminderCheck } from './hooks/useReminderCheck';
import './styles/index.css';

// Inner app - co the truy cap vao AppContext
const AppInner: React.FC = () => {
  const { openModal, settings } = useAppContext();
  const { selectedTaskId, tasks } = useTaskContext();
  const [showReport, setShowReport] = useState(false);

  // Webhook integration
  const { onTaskReminded } = useWebhook(
    settings.webhookUrl,
    settings.webhookEnabled
  );

  // Reminder checker
  useReminderCheck({
    tasks,
    webhookEnabled: settings.webhookEnabled,
    onTaskReminded,
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
          <ReportPage />
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

      {/* Pomodoro widget */}
      <PomodoroWidget />

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
    <TaskProvider>
      <AppInner />
    </TaskProvider>
  </AppProvider>
);

export default App;
