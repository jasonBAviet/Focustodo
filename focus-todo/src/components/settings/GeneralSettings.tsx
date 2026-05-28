// ============================================================
// FOCUS TO-DO - GeneralSettings
// Tab General - Xuat/Nhap du lieu, Focus Goal, Thong tin app
// ============================================================
import React, { useRef, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useTaskContext } from '../../contexts/TaskContext';
import { exportTasks } from '../../utils/exportUtils';
import { importFromCSV, readFileAsText } from '../../utils/importUtils';

// ----------------------------------------------------------
// Kieu du lieu thong bao import
// ----------------------------------------------------------
type ImportState =
  | { status: 'idle' }
  | { status: 'success'; count: number }
  | { status: 'error'; message: string };

// ----------------------------------------------------------
// Styles
// ----------------------------------------------------------
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 12,
  marginTop: 20,
};

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  transition: 'background var(--transition-fast)',
  marginRight: 10,
};

const btnPrimaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'var(--accent)',
  color: '#fff',
  border: '1px solid var(--accent)',
};

const inputStyle: React.CSSProperties = {
  width: 100,
  padding: '7px 10px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  textAlign: 'right',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--divider)',
  margin: '16px 0',
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0',
  fontSize: 'var(--text-sm)',
  borderBottom: '1px solid var(--divider)',
};

// ----------------------------------------------------------
// Component chinh
// ----------------------------------------------------------
const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useAppContext();
  const { tasks, addTask, updateTask, getProjectName } = useTaskContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ status: 'idle' });

  // ----------------------------------------------------------
  // Xuat du lieu CSV
  // ----------------------------------------------------------
  const handleExport = () => {
    exportTasks(tasks, getProjectName);
  };

  // ----------------------------------------------------------
  // Nhap tu CSV
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
        setImportState({ status: 'error', message: 'File khong co du lieu hop le.' });
        return;
      }

      // Them tung task vao TaskContext
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
        message: err instanceof Error ? err.message : 'Loi doc file.',
      });
    } finally {
      // Reset input de co the chon lai cung file
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
    <div>
      {/* Section Du lieu */}
      <div style={sectionTitleStyle}>Du lieu</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" style={btnPrimaryStyle} onClick={handleExport}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Xuat du lieu (CSV)
        </button>

        <button type="button" style={btnStyle} onClick={handleImportClick}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 9V1M4 4l3-3 3 3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Nhap tu CSV
        </button>

        {/* Input file an */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Thong bao import */}
      {importState.status === 'success' && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(6,214,160,0.12)',
          color: '#06d6a0',
          fontSize: 'var(--text-sm)',
          marginBottom: 10,
        }}>
          Nhap thanh cong {importState.count} task tu CSV.
        </div>
      )}
      {importState.status === 'error' && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(242,95,92,0.12)',
          color: '#f25f5c',
          fontSize: 'var(--text-sm)',
          marginBottom: 10,
        }}>
          Loi: {importState.message}
        </div>
      )}

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
        Hien co {tasks.length} task trong he thong.
      </div>

      <div style={dividerStyle} />

      {/* Section Focus Goal */}
      <div style={sectionTitleStyle}>Focus Goal</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', flex: 1 }}>
          Muc tieu focus hang ngay
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            style={inputStyle}
            value={settings.dailyFocusGoalHours}
            onChange={handleGoalChange}
          />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>gio/ngay</span>
        </div>
      </div>

      <div style={{ ...dividerStyle, marginTop: 20 }} />

      {/* Section Thong tin */}
      <div style={sectionTitleStyle}>Thong tin ung dung</div>

      <div>
        <div style={infoRowStyle}>
          <span style={{ color: 'var(--text-secondary)' }}>Phien ban</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>1.0.0</span>
        </div>
        <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
          <span style={{ color: 'var(--text-secondary)' }}>GitHub</span>
          <a
            href="https://github.com/focus-todo"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}
          >
            github.com/focus-todo
          </a>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
