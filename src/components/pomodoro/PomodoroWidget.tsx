// ============================================================
// FOCUS TO-DO - PomodoroWidget
// Widget Pomodoro cố định cuối màn hình (pill shape)
// ============================================================
import React from 'react';
import { usePomodoroContext } from '../../contexts/PomodoroContext';
import { useAppContext } from '../../contexts/AppContext';
import { useTaskContext } from '../../contexts/TaskContext';

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function formatMM(seconds: number): string {
  return String(Math.ceil(seconds / 60));
}


// ----------------------------------------------------------
// Styles
// ----------------------------------------------------------
const injectKeyframes = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('pomo-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'pomo-keyframes';
  style.textContent = `
    @keyframes timer-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(242,95,92,0.55); }
      70%  { box-shadow: 0 0 0 14px rgba(242,95,92,0); }
      100% { box-shadow: 0 0 0 0 rgba(242,95,92,0); }
    }
    @keyframes pomo-fade-in {
      from { opacity: 0; transform: translateX(-50%) translateY(12px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
};
injectKeyframes();

// ----------------------------------------------------------
// PomodoroWidget
// ----------------------------------------------------------
const PomodoroWidget: React.FC = () => {
  const { settings } = useAppContext();
  useTaskContext();
  const pomo = usePomodoroContext();

  const {
    phase, timeLeft, isRunning, cycleCount,
    start, pause, setShowModal,
  } = pomo;

  const phaseLabel = phase === 'focus'
    ? 'Focus'
    : phase === 'short-break'
    ? 'Short Break'
    : phase === 'long-break'
    ? 'Long Break'
    : 'Ready';

  const accentColor = settings.accentColor ?? '#f25f5c';
  const isPulsing = phase === 'focus' && isRunning;

  // ----------------------------------------------------------
  // Collapsed pill
  // ----------------------------------------------------------
  return (
    <div
      onClick={() => setShowModal(true)}
      style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(12px)',
          border: `1.5px solid var(--border)`,
          borderRadius: 999,
          padding: '8px 20px',
          cursor: 'pointer',
          zIndex: 9999,
          animation: isPulsing ? 'timer-pulse 1.8s infinite' : undefined,
          transition: 'box-shadow 0.3s',
          userSelect: 'none',
        }}
      >
        {/* Phase dot */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: phase === 'focus' ? accentColor : '#4cc9f0',
          display: 'inline-block', flexShrink: 0,
        }} />
        {/* Pomodoro icons (cycleCount today) */}
        {cycleCount > 0 && (
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {Array.from({ length: Math.min(cycleCount, 6) }).map((_, i) => (
              <span key={i} style={{ fontSize: 14 }}>🍅</span>
            ))}
            {cycleCount > 6 && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>+{cycleCount - 6}</span>
            )}
          </div>
        )}
        {/* Time left */}
        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>
          {formatMM(timeLeft)}
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{phaseLabel}</span>
        {/* Play/Pause */}
        <button
          onClick={(e) => { e.stopPropagation(); if (isRunning) pause(); else start(); }}
          style={{
            background: accentColor,
            border: 'none',
            borderRadius: '50%',
            width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', fontSize: 13,
          }}
        >
          {isRunning ? '⏸' : '▶'}
        </button>
      </div>
    );
};

export default PomodoroWidget;
