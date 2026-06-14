// ============================================================
// FOCUS TO-DO - AccountSettings (Data / Sync & User Profile)
// DB connection status, metrics, manual sync, account info.
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '@/core/contexts/AppContext';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useAuth } from '@/features/auth/AuthContext';
import { saveRemoteAppState } from '@/utils/remoteState';
import type { RemoteAppState } from '@/utils/remoteState';

type HealthState = 'checking' | 'ok' | 'error';

type SectionKey = 'accountInfo' | 'dbStatus' | 'stats' | 'sync';

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 12,
  marginTop: 20,
  cursor: 'pointer',
  userSelect: 'none',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  fontSize: 'var(--text-sm)',
  borderBottom: '1px solid var(--divider)',
};

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  transition: 'background var(--transition-fast)',
};

const logoutBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'var(--accent-soft)',
  color: 'var(--accent)',
  border: '1px solid var(--accent-glow)',
};

const IconChevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
      transition: 'transform var(--transition-fast)',
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const AccountSettings: React.FC = () => {
  const { settings } = useAppContext();
  const { user, logout } = useAuth();
  const {
    tasks, projects, folders, tags, pomodoroSessions, pomodoroRecords, attachments,
    selectedTaskId, activeView, activeProjectId, searchQuery,
  } = useTaskContext();

  const [health, setHealth] = useState<HealthState>('checking');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Toggle state of sections in Account Settings
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    accountInfo: true,
    dbStatus: false,
    stats: false,
    sync: true,
  });

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
      tasks, projects, folders, tags, settings, pomodoroSessions, pomodoroRecords, attachments,
      selectedTaskId, activeView, activeProjectId, searchQuery,
    };
    try {
      await saveRemoteAppState(state);
      setLastSaved(new Date().toLocaleTimeString('vi-VN'));
      setMessage('Successfully saved all data to DB.');
    } catch (err) {
      setMessage('Error saving to DB: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(null);
    }
  };

  const handleReload = () => {
    setBusy('reload');
    window.location.reload();
  };

  const handleClearCache = () => {
    setBusy('clear');
    const keys = [
      'focus-tasks', 'focus-projects', 'focus-folders', 'focus-tags',
      'focus-pomodoro-sessions', 'focus-pomodoro-records', 'focus-attachments', 'focus-selected-task',
      'focus-active-view', 'focus-active-project', 'focus-search',
      'focus-settings', 'ftd_webhook_events',
    ];
    keys.forEach((k) => window.localStorage.removeItem(k));
    window.location.reload();
  };

  const healthLabel = health === 'checking' ? 'Checking...' : health === 'ok' ? 'Connection OK' : 'Connection failed';
  const healthColor = health === 'ok' ? '#06d6a0' : health === 'error' ? '#f25f5c' : 'var(--text-muted)';

  return (
    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
      {/* App Information */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Focus To-Do</div>
        <div style={{ color: 'var(--text-muted)' }}>Version 1.0.0 · Data stored on PostgreSQL</div>
      </div>

      {/* 1. Account info */}
      <div>
        <div style={sectionHeaderStyle} onClick={() => toggleSection('accountInfo')}>
          <span>Account Information</span>
          <IconChevron expanded={expandedSections.accountInfo} />
        </div>
        {expandedSections.accountInfo && (
          <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--divider)' }}>
            {user ? (
              <>
                <div style={rowStyle}>
                  <span>Email</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user.email}</span>
                </div>
                <div style={rowStyle}>
                  <span>Account ID</span>
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{user.id}</span>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" style={logoutBtnStyle} onClick={logout}>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '8px 0', color: 'var(--text-muted)' }}>
                Not logged in.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Database status */}
      <div>
        <div style={sectionHeaderStyle} onClick={() => toggleSection('dbStatus')}>
          <span>Database Status</span>
          <IconChevron expanded={expandedSections.dbStatus} />
        </div>
        {expandedSections.dbStatus && (
          <div>
            <div style={rowStyle}>
              <span>DB Connection</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: healthColor, fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, display: 'inline-block' }} />
                {healthLabel}
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span>Last saved</span>
              <span style={{ color: 'var(--text-primary)' }}>{lastSaved ?? '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Metrics */}
      <div>
        <div style={sectionHeaderStyle} onClick={() => toggleSection('stats')}>
          <span>Statistics</span>
          <IconChevron expanded={expandedSections.stats} />
        </div>
        {expandedSections.stats && (
          <div>
            <div style={rowStyle}><span>Tasks</span><span style={{ color: 'var(--text-primary)' }}>{tasks.length}</span></div>
            <div style={rowStyle}><span>Projects</span><span style={{ color: 'var(--text-primary)' }}>{projects.length}</span></div>
            <div style={rowStyle}><span>Tags</span><span style={{ color: 'var(--text-primary)' }}>{tags.length}</span></div>
            <div style={rowStyle}><span>Folders</span><span style={{ color: 'var(--text-primary)' }}>{folders.length}</span></div>
            <div style={rowStyle}><span>Pomodoro sessions</span><span style={{ color: 'var(--text-primary)' }}>{pomodoroSessions.length}</span></div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}><span>Pomodoro runs</span><span style={{ color: 'var(--text-primary)' }}>{pomodoroRecords.length}</span></div>
          </div>
        )}
      </div>

      {/* 4. Sync actions */}
      <div>
        <div style={sectionHeaderStyle} onClick={() => toggleSection('sync')}>
          <span>Manual Sync</span>
          <IconChevron expanded={expandedSections.sync} />
        </div>
        {expandedSections.sync && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
            <button type="button" style={{ ...btnStyle, opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={handleReload}>
              Reload from DB
            </button>
            <button type="button" style={{ ...btnStyle, opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={handleForceSave}>
              {busy === 'save' ? 'Saving...' : 'Save to DB now'}
            </button>
            <button type="button" style={{ ...btnStyle, opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={handleClearCache}>
              Clear local cache
            </button>
            <button type="button" style={{ ...btnStyle, opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={checkHealth}>
              Check connection
            </button>
          </div>
        )}
      </div>

      {message && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          background: message.startsWith('Error') ? 'rgba(242,95,92,0.12)' : 'rgba(6,214,160,0.12)',
          color: message.startsWith('Error') ? '#f25f5c' : '#06d6a0',
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
