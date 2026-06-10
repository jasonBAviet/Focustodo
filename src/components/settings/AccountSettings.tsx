// ============================================================
// FOCUS TO-DO - AccountSettings (Data / Sync)
// Trạng thái kết nối DB, số liệu, đồng bộ thủ công.
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useTaskContext } from '../../contexts/TaskContext';
import { saveRemoteAppState } from '../../utils/remoteState';
import type { RemoteAppState } from '../../utils/remoteState';

type HealthState = 'checking' | 'ok' | 'error';

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 12,
  marginTop: 20,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '7px 0',
  fontSize: 'var(--text-sm)',
  borderBottom: '1px solid var(--divider)',
};

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  transition: 'background var(--transition-fast)',
};

const AccountSettings: React.FC = () => {
  const { settings } = useAppContext();
  const {
    tasks, projects, folders, tags, pomodoroSessions, attachments,
    selectedTaskId, activeView, activeProjectId, searchQuery,
  } = useTaskContext();

  const [health, setHealth] = useState<HealthState>('checking');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setHealth('checking');
    try {
      const res = await fetch('/api/health');
      setHealth(res.ok ? 'ok' : 'error');
    } catch {
      setHealth('error');
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleForceSave = async () => {
    setBusy('save');
    setMessage(null);
    const state: RemoteAppState = {
      tasks, projects, folders, tags, settings, pomodoroSessions, attachments,
      selectedTaskId, activeView, activeProjectId, searchQuery,
    };
    try {
      await saveRemoteAppState(state);
      setLastSaved(new Date().toLocaleTimeString('vi-VN'));
      setMessage('Đã lưu toàn bộ dữ liệu lên DB.');
    } catch (err) {
      setMessage('Lỗi lưu lên DB: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(null);
    }
  };

  const handleReload = () => {
    setBusy('reload');
    // Load effect chạy lại khi mount -> reload trang là cách an toàn nhất
    window.location.reload();
  };

  const handleClearCache = () => {
    setBusy('clear');
    const keys = [
      'focus-tasks', 'focus-projects', 'focus-folders', 'focus-tags',
      'focus-pomodoro-sessions', 'focus-attachments', 'focus-selected-task',
      'focus-active-view', 'focus-active-project', 'focus-search',
      'focus-settings', 'ftd_webhook_events',
    ];
    keys.forEach((k) => window.localStorage.removeItem(k));
    // Tải lại từ DB (nguồn chính)
    window.location.reload();
  };

  const healthLabel = health === 'checking' ? 'Đang kiểm tra...' : health === 'ok' ? 'Kết nối OK' : 'Không kết nối được';
  const healthColor = health === 'ok' ? '#06d6a0' : health === 'error' ? '#f25f5c' : 'var(--text-muted)';

  return (
    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
      {/* Thong tin app */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Focus To-Do</div>
        <div style={{ color: 'var(--text-muted)' }}>Phiên bản 1.0.0 · Dữ liệu lưu trên PostgreSQL</div>
      </div>

      {/* Trang thai DB */}
      <div style={sectionTitleStyle}>Trạng thái cơ sở dữ liệu</div>
      <div style={rowStyle}>
        <span>Kết nối DB</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: healthColor, fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, display: 'inline-block' }} />
          {healthLabel}
        </span>
      </div>
      <div style={rowStyle}>
        <span>Lần lưu gần nhất</span>
        <span style={{ color: 'var(--text-primary)' }}>{lastSaved ?? '—'}</span>
      </div>

      {/* So lieu */}
      <div style={sectionTitleStyle}>Số liệu</div>
      <div style={rowStyle}><span>Tasks</span><span style={{ color: 'var(--text-primary)' }}>{tasks.length}</span></div>
      <div style={rowStyle}><span>Projects</span><span style={{ color: 'var(--text-primary)' }}>{projects.length}</span></div>
      <div style={rowStyle}><span>Tags</span><span style={{ color: 'var(--text-primary)' }}>{tags.length}</span></div>
      <div style={rowStyle}><span>Folders</span><span style={{ color: 'var(--text-primary)' }}>{folders.length}</span></div>
      <div style={{ ...rowStyle, borderBottom: 'none' }}><span>Pomodoro sessions</span><span style={{ color: 'var(--text-primary)' }}>{pomodoroSessions.length}</span></div>

      {/* Hanh dong */}
      <div style={sectionTitleStyle}>Đồng bộ</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" style={{ ...btnStyle, opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={handleReload}>
          Tải lại từ DB
        </button>
        <button type="button" style={{ ...btnStyle, opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={handleForceSave}>
          {busy === 'save' ? 'Đang lưu...' : 'Lưu ngay lên DB'}
        </button>
        <button type="button" style={{ ...btnStyle, opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={handleClearCache}>
          Xoá cache cục bộ
        </button>
        <button type="button" style={{ ...btnStyle, opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={checkHealth}>
          Kiểm tra kết nối
        </button>
      </div>

      {message && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          background: message.startsWith('Lỗi') ? 'rgba(242,95,92,0.12)' : 'rgba(6,214,160,0.12)',
          color: message.startsWith('Lỗi') ? '#f25f5c' : '#06d6a0',
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
