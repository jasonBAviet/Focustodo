import React, { useState, useMemo } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';

const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
  focus: { label: 'Focus', color: '#f25f5c' },
  'short-break': { label: 'Short Break', color: '#4cc9f0' },
  'long-break': { label: 'Long Break', color: '#06d6a0' },
};

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

interface PomodoroRecordsProps {
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
}

const PomodoroRecords: React.FC<PomodoroRecordsProps> = ({
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
}) => {
  const { pomodoroSessions, pomodoroRecords, projects, tasks } = useTaskContext();
  const [viewMode, setViewMode] = useState<'runs' | 'sessions'>('runs');

  // Áp dụng bộ lọc cho Pomodoro Records (Runs)
  const filteredRecords = useMemo(() => {
    return pomodoroRecords.filter((r) => {
      const task = tasks.find((t) => t.id === r.taskId);
      if (!task) return false;

      if (selectedFolderId !== 'all') {
        if (!task.projectId) return false;
        const project = projects.find((p) => p.id === task.projectId);
        if (!project || project.folderId !== selectedFolderId) return false;
      }

      if (selectedProjectId !== 'all') {
        if (task.projectId !== selectedProjectId) return false;
      }

      if (selectedTagId !== 'all') {
        if (!task.tags || !task.tags.includes(selectedTagId)) return false;
      }

      return true;
    });
  }, [pomodoroRecords, tasks, projects, selectedFolderId, selectedProjectId, selectedTagId]);

  // Áp dụng bộ lọc cho Pomodoro Sessions (Logs)
  const filteredSessions = useMemo(() => {
    return pomodoroSessions.filter((s) => {
      const task = tasks.find((t) => t.id === s.taskId);
      if (!task) return false;

      if (selectedFolderId !== 'all') {
        if (!task.projectId) return false;
        const project = projects.find((p) => p.id === task.projectId);
        if (!project || project.folderId !== selectedFolderId) return false;
      }

      if (selectedProjectId !== 'all') {
        if (task.projectId !== selectedProjectId) return false;
      }

      if (selectedTagId !== 'all') {
        if (!task.tags || !task.tags.includes(selectedTagId)) return false;
      }

      return true;
    });
  }, [pomodoroSessions, tasks, projects, selectedFolderId, selectedProjectId, selectedTagId]);

  const recentSessions = filteredSessions.slice(0, 50);
  const recentRecords = filteredRecords.slice(0, 50);

  const renderSessions = () => {
    if (recentSessions.length === 0) {
      return (
        <div className="report-empty">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="16" stroke="var(--border-strong)" strokeWidth="1.5"/>
            <path d="M20 12v8l4 4" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Không tìm thấy nhật ký Pomodoro nào phù hợp</span>
        </div>
      );
    }

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--divider)' }}>
            <th style={thStyle}>Loại</th>
            <th style={thStyle}>Công việc</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Thời lượng</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Thời gian</th>
          </tr>
        </thead>
        <tbody>
          {recentSessions.map((s) => {
            const cfg = PHASE_CONFIG[s.type] ?? PHASE_CONFIG.focus;
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: cfg.color, display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{cfg.label}</span>
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {s.taskTitle || 'Untitled'}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {s.duration}m
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                    {formatDate(s.startTime)} {formatTime(s.startTime)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderRuns = () => {
    if (recentRecords.length === 0) {
      return (
        <div className="report-empty">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="16" stroke="var(--border-strong)" strokeWidth="1.5"/>
            <path d="M20 12v8l4 4" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Không tìm thấy chu kỳ Pomodoro nào phù hợp</span>
        </div>
      );
    }

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--divider)' }}>
            <th style={thStyle}>Công việc</th>
            <th style={thStyle}>Tập trung (Bắt đầu → Kết thúc)</th>
            <th style={thStyle}>Nghỉ ngơi (Bắt đầu → Kết thúc)</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {recentRecords.map((r) => {
            const isFocusRunning = !r.endTime;
            const isBreakRunning = r.breakStart && !r.breakEnd;
            const statusLabel = isFocusRunning 
              ? 'Tập trung' 
              : isBreakRunning 
                ? 'Nghỉ ngơi' 
                : r.completed 
                  ? 'Hoàn thành' 
                  : 'Bỏ dở';
            const statusColor = isFocusRunning
              ? '#f4a261'
              : isBreakRunning
                ? '#4cc9f0'
                : r.completed
                  ? '#06d6a0'
                  : '#f25f5c';

            return (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={tdStyle}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {r.taskTitle || 'Untitled'}
                  </div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                    {formatDate(r.startTime)}
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(r.startTime)} → {isFocusRunning ? 'Running' : formatTime(r.endTime)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.breakStart ? `${formatTime(r.breakStart)} → ${isBreakRunning ? 'Running' : formatTime(r.breakEnd)}` : 'Không nghỉ'}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    justifyContent: 'flex-end',
                    float: 'right'
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: statusColor, display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                      {statusLabel}
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      {/* Tab Switch View Mode */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setViewMode('runs')}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: viewMode === 'runs' ? 'var(--bg-card-hover)' : 'transparent',
            color: viewMode === 'runs' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          Chu kỳ Pomodoro ({filteredRecords.length})
        </button>
        <button
          onClick={() => setViewMode('sessions')}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: viewMode === 'sessions' ? 'var(--bg-card-hover)' : 'transparent',
            color: viewMode === 'sessions' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          Nhật ký giai đoạn ({filteredSessions.length})
        </button>
      </div>

      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {viewMode === 'runs' ? renderRuns() : renderSessions()}
      </div>

      <style>{`
        .report-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; padding: 40px 0;
          color: var(--text-tertiary); font-size: var(--text-sm);
        }
      `}</style>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  fontSize: 'var(--text-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
};

export default PomodoroRecords;
