import React, { useState } from 'react';
import { TaskProvider, useTaskContext } from './contexts/TaskContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import Sidebar from './components/layout/Sidebar';
import TaskList from './components/task/TaskList';
import TaskPanel from './components/layout/TaskPanel';
import AddProjectDialog from './components/common/AddProjectDialog';
import ReportPage from './components/report/ReportPage';
import PomodoroWidget from './components/pomodoro/PomodoroWidget';
import './styles/index.css';

// Inner app - co the truy cap vao AppContext
const AppInner: React.FC = () => {
  const { openModal } = useAppContext();
  const { selectedTaskId } = useTaskContext();
  const [showReport, setShowReport] = useState(false);

  const handleShowReport = () => setShowReport((v) => !v);

  return (
    <div className={`app-layout ${!selectedTaskId ? 'panel-hidden' : ''}`}>
      {/* Left sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="main-content">
        {showReport ? (
          <ReportPage />
        ) : (
          <>
            {/* Report shortcut button */}
            <div className="report-shortcut">
              <button
                className="report-shortcut-btn"
                onClick={handleShowReport}
                title="Xem bao cao"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="10" width="3" height="4" rx="1" fill="currentColor"/>
                  <rect x="6.5" y="7" width="3" height="7" rx="1" fill="currentColor"/>
                  <rect x="11" y="4" width="3" height="10" rx="1" fill="currentColor"/>
                </svg>
                Report
              </button>
            </div>
            <TaskList />
          </>
        )}
      </main>

      {/* Right panel (task detail) */}
      {selectedTaskId && <TaskPanel />}

      {/* Dialogs */}
      <AddProjectDialog />

      {/* Pomodoro widget */}
      <PomodoroWidget />

      {/* Settings - lazy */}
      {openModal === 'settings' && (
        <React.Suspense fallback={null}>
          <SettingsDialogLazy />
        </React.Suspense>
      )}

      <style>{`
        .report-shortcut {
          display: flex; justify-content: flex-end;
          padding: 8px 24px 0;
        }
        .report-shortcut-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--glass-bg); border: 1px solid var(--border);
          border-radius: var(--radius-full); padding: 5px 12px;
          color: var(--text-secondary); font-size: var(--text-xs);
          cursor: pointer; font-family: var(--font-main);
          transition: all var(--transition-fast);
        }
        .report-shortcut-btn:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
          border-color: var(--border-strong);
        }
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
