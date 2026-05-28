import React from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import type { PomodoroSession } from '../../types';

const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
  focus: { label: 'Focus', color: '#f25f5c' },
  'short-break': { label: 'Short Break', color: '#4cc9f0' },
  'long-break': { label: 'Long Break', color: '#06d6a0' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

const PomodoroRecords: React.FC = () => {
  const [sessions] = useLocalStorage<PomodoroSession[]>('focus-pomodoro-sessions', []);

  const recentSessions = sessions.slice(0, 50);

  if (recentSessions.length === 0) {
    return (
      <div className="report-empty">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="16" stroke="var(--border-strong)" strokeWidth="1.5"/>
          <path d="M20 12v8l4 4" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>No Pomodoro sessions yet</span>
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--divider)' }}>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Task</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Duration</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Time</th>
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
