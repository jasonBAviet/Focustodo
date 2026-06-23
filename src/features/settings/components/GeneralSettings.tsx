// ============================================================
// FOCUS TO-DO - GeneralSettings
// General Tab - Export/Import data, Focus Goal, App info
// ============================================================
import React, { useRef, useState } from 'react';
import { useAppContext } from '@/core/contexts/AppContext';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { exportTasks } from '@/utils/exportUtils';
import { importFromCSV, readFileAsText } from '@/utils/importUtils';

// ----------------------------------------------------------
// Import notification data type
// ----------------------------------------------------------
type ImportState =
  | { status: 'idle' }
  | { status: 'success'; count: number }
  | { status: 'error'; message: string };

// ----------------------------------------------------------
// Styles
// ----------------------------------------------------------
// Custom styles removed in favor of styled JSX style block below to support hover & focus transitions cleanly.

// ----------------------------------------------------------
// Main component
// ----------------------------------------------------------
const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useAppContext();
  const { tasks, addTask, updateTask, getProjectName } = useTaskContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ status: 'idle' });

  // ----------------------------------------------------------
  // Export CSV data
  // ----------------------------------------------------------
  const handleExport = () => {
    exportTasks(tasks, getProjectName);
  };

  // ----------------------------------------------------------
  // Import from CSV
  // ----------------------------------------------------------
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportState({ status: 'idle' });

    try {
      const text = await readFileAsText(file);
      const imported = importFromCSV(text);

      if (imported.length === 0) {
        setImportState({ status: 'error', message: 'File has no valid data.' });
        return;
      }

      // Add each task to TaskContext
      imported.forEach((partial) => {
        if (!partial.title) return;
        const task = addTask(partial.title, partial.projectId ?? null, partial.priority ?? 'none');
        updateTask(task.id, {
          dueDate: partial.dueDate ?? task.dueDate,
          note: partial.note ?? task.note,
          pomodoroEstimate: partial.pomodoroEstimate ?? task.pomodoroEstimate,
          pomodoroCompleted: partial.pomodoroCompleted ?? task.pomodoroCompleted,
          totalFocusTime: partial.totalFocusTime ?? task.totalFocusTime,
          completed: partial.completed ?? task.completed,
          completedAt: partial.completedAt ?? task.completedAt,
          flagged: partial.flagged ?? task.flagged,
          repeat: partial.repeat ?? task.repeat,
          repeatCustom: partial.repeatCustom ?? task.repeatCustom,
          reminder: partial.reminder ?? task.reminder,
        });
      });

      setImportState({ status: 'success', count: imported.length });
    } catch (err) {
      setImportState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Error reading file.',
      });
    } finally {
      // Reset input to allow selecting same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ----------------------------------------------------------
  // Focus Goal
  // ----------------------------------------------------------
  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      updateSettings({ dailyFocusGoalHours: val });
    }
  };

  return (
    <>
      <style>{`
        .general-settings-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .settings-section-title {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 10px;
        }
        .settings-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .settings-btn-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .settings-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .settings-btn-secondary {
          background: var(--bg-input);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }
        .settings-btn-secondary:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-strong);
        }
        .settings-btn-primary {
          background: var(--accent);
          color: var(--text-on-accent);
          border: 1px solid var(--accent);
        }
        .settings-btn-primary:hover {
          background: var(--accent-hover);
          box-shadow: var(--shadow-sm);
        }
        .settings-input {
          width: 72px;
          padding: 8px 12px;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          outline: none;
          text-align: center;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .settings-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .settings-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-sm);
          padding: 4px 0;
        }
        .settings-divider {
          height: 1px;
          background: var(--divider);
        }
      `}</style>

      <div className="general-settings-container">
        {/* Data Section */}
        <div>
          <div className="settings-section-title">Data</div>
          <div className="settings-card">
            <div className="settings-btn-group">
              <button type="button" className="settings-btn settings-btn-primary" onClick={handleExport}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Export data (CSV)
              </button>

              <button type="button" className="settings-btn settings-btn-secondary" onClick={handleImportClick}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 9V1M4 4l3-3 3 3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Import from CSV
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* Import notification */}
            {importState.status === 'success' && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(6,214,160,0.12)',
                color: '#06d6a0',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
              }}>
                Successfully imported {importState.count} tasks from CSV.
              </div>
            )}
            {importState.status === 'error' && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(242,95,92,0.12)',
                color: '#f25f5c',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
              }}>
                Error: {importState.message}
              </div>
            )}

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Currently {tasks.length} tasks in the system.
            </div>
          </div>
        </div>

        {/* Focus Goal Section */}
        <div>
          <div className="settings-section-title">Focus Goal</div>
          <div className="settings-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
              Daily focus goal
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                className="settings-input"
                value={settings.dailyFocusGoalHours}
                onChange={handleGoalChange}
              />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>hours/day</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div>
          <div className="settings-section-title">App Information</div>
          <div className="settings-card" style={{ gap: 12 }}>
            <div className="settings-info-row">
              <span style={{ color: 'var(--text-secondary)' }}>Version</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>1.0.0</span>
            </div>
            <div className="settings-divider" />
            <div className="settings-info-row">
              <span style={{ color: 'var(--text-secondary)' }}>GitHub</span>
              <a
                href="https://github.com/focus-todo"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)', textDecoration: 'none', fontWeight: 500 }}
              >
                github.com/focus-todo
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GeneralSettings;
