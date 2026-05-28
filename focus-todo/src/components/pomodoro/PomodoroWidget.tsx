// ============================================================
// FOCUS TO-DO - PomodoroWidget
// Widget Pomodoro cố định cuối màn hình (pill shape)
// ============================================================
import React, { useState, useCallback } from 'react';
import usePomodoro from '../../hooks/usePomodoro';
import { usePomodoroSessions } from '../../hooks/usePomodoroSessions';
import { useAppContext } from '../../contexts/AppContext';
import { useTaskContext } from '../../contexts/TaskContext';
import type { PomodoroSession } from '../../types';

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------
function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMM(seconds: number): string {
  return String(Math.ceil(seconds / 60));
}

const CIRCLE_RADIUS = 54;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

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
  const { tasks, updateTask } = useTaskContext();
  const [expanded, setExpanded] = useState(false);
  const [, addSession] = usePomodoroSessions();

  const handleSessionComplete = useCallback((session: PomodoroSession) => {
    addSession(session);
  }, [addSession]);

  // Callback cập nhật focus time cho task
  const handleFocusTimeUpdate = useCallback((taskId: string, seconds: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const addedMinutes = seconds / 60;
    updateTask(taskId, { totalFocusTime: (task.totalFocusTime ?? 0) + addedMinutes });
  }, [tasks, updateTask]);

  const pomo = usePomodoro({
    settings,
    onSessionComplete: handleSessionComplete,
    onFocusTimeUpdate: handleFocusTimeUpdate,
  });

  const {
    phase, timeLeft, isRunning, cycleCount,
    currentTaskTitle, progressPercent,
    start, pause, reset, skip,
  } = pomo;

  const linkedTask = tasks.find((t) => t.id === pomo.currentTaskId);
  const taskLabel = currentTaskTitle ?? linkedTask?.title ?? 'Focus Time';

  // SVG progress
  const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - progressPercent / 100);

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
  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
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
          display: 'inline-block',
        }} />
        {/* Phút còn lại */}
        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
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
  }

  // ----------------------------------------------------------
  // Expanded card
  // ----------------------------------------------------------
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(16px)',
      border: `1.5px solid var(--border)`,
      borderRadius: 24,
      padding: '24px 32px',
      width: 320,
      zIndex: 9999,
      animation: 'pomo-fade-in 0.22s ease',
      boxShadow: isPulsing
        ? `0 0 32px ${accentColor}66, 0 8px 32px #0008`
        : '0 8px 32px #0008',
      transition: 'box-shadow 0.4s',
    }}>
      {/* Nút đóng */}
      <button
        onClick={() => setExpanded(false)}
        style={{
          position: 'absolute', top: 12, right: 14,
          background: 'transparent', border: 'none',
          color: 'var(--text-tertiary)', fontSize: 18, cursor: 'pointer', lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Tên task */}
      <p style={{
        color: 'var(--text-secondary)', fontSize: 12, textAlign: 'center',
        marginBottom: 4, marginTop: 0, letterSpacing: 0.5,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {taskLabel}
      </p>

      {/* Phase label */}
      <p style={{
        color: phase === 'focus' ? accentColor : '#4cc9f0',
        fontSize: 11, textAlign: 'center', fontWeight: 600,
        margin: '0 0 16px', letterSpacing: 2, textTransform: 'uppercase',
      }}>
        {phaseLabel}
      </p>

      {/* SVG Countdown circle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={64} cy={64} r={CIRCLE_RADIUS}
            stroke="#333" strokeWidth={7} fill="none" />
          {/* Progress */}
          <circle cx={64} cy={64} r={CIRCLE_RADIUS}
            stroke={phase === 'focus' ? accentColor : '#4cc9f0'}
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s linear' }}
          />
        </svg>
        {/* Thời gian giữa vòng tròn */}
        <div style={{
          position: 'absolute',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 128, height: 128,
          marginTop: 0,
        }}>
          <span style={{
            color: 'var(--text-primary)', fontWeight: 700, fontSize: 28,
            fontVariantNumeric: 'tabular-nums', letterSpacing: 2,
          }}>
            {formatMMSS(timeLeft)}
          </span>
        </div>
      </div>

      {/* Dots chu kỳ */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        {Array.from({ length: settings.longBreakAfter }).map((_, i) => (
          <span key={i} style={{
            width: 10, height: 10, borderRadius: '50%',
            background: i < (cycleCount % settings.longBreakAfter)
              ? accentColor : '#333',
            border: `1.5px solid ${accentColor}66`,
            display: 'inline-block',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Nút điều khiển: Reset | Play/Pause | Skip */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={btnStyle('#2a2a33')}
          title="Reset"
        >
          ↺
        </button>
        <button
          onClick={isRunning ? pause : start}
          style={btnStyle(accentColor, true)}
          title={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? '⏸' : '▶'}
        </button>
        <button
          onClick={skip}
          style={btnStyle('#2a2a33')}
          title="Skip"
        >
          ⏭
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------
// Helper tạo style nút
// ----------------------------------------------------------
function btnStyle(bg: string, primary = false): React.CSSProperties {
  return {
    background: bg,
    border: 'none',
    borderRadius: '50%',
    width: primary ? 52 : 40,
    height: primary ? 52 : 40,
    fontSize: primary ? 18 : 16,
    color: primary ? '#fff' : 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
  };
}

export default PomodoroWidget;
