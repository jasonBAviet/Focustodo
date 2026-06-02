import React from 'react';
import { usePomodoroContext } from '../../contexts/PomodoroContext';
import { useAppContext } from '../../contexts/AppContext';

const CIRCLE_RADIUS = 54;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const SVGIcons = {
  reset: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2-8.83"/>
    </svg>
  ),
  play: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  pause: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>
  ),
  skip: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4"/>
      <line x1="19" y1="4" x2="19" y2="20"/>
    </svg>
  ),
};

const PomodoroModal: React.FC = () => {
  const pomo = usePomodoroContext();
  const { settings } = useAppContext();

  if (!pomo.showModal) return null;

  const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - pomo.progressPercent / 100);

  const phaseLabel = pomo.phase === 'focus'
    ? 'Focus'
    : pomo.phase === 'short-break'
      ? 'Short Break'
      : pomo.phase === 'long-break'
        ? 'Long Break'
        : 'Ready';

  const accentColor = settings.accentColor ?? '#f25f5c';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => pomo.setShowModal(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 24,
          padding: '24px 32px',
          width: 320,
          zIndex: 9999,
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.25)',
          animation: 'pomo-modal-in 0.25s ease',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => pomo.setShowModal(false)}
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: 24,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>

        {/* Task name */}
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 12,
            textAlign: 'center',
            marginBottom: 4,
            marginTop: 0,
            letterSpacing: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {pomo.currentTaskTitle ?? 'Focus Time'}
        </p>

        {/* Phase label */}
        <p
          style={{
            color: pomo.phase === 'focus' ? accentColor : '#4cc9f0',
            fontSize: 11,
            textAlign: 'center',
            fontWeight: 600,
            margin: '0 0 16px',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {phaseLabel}
        </p>

        {/* SVG Countdown circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
          <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx={64} cy={64} r={CIRCLE_RADIUS}
              stroke="var(--border-strong)" strokeWidth={7} fill="none" />
            {/* Progress */}
            <circle cx={64} cy={64} r={CIRCLE_RADIUS}
              stroke={pomo.phase === 'focus' ? accentColor : '#4cc9f0'}
              strokeWidth={7}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s linear' }}
            />
          </svg>
          {/* Time in center */}
          <div style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 128,
            height: 128,
          }}>
            <span style={{
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 28,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 2,
            }}>
              {formatMMSS(pomo.timeLeft)}
            </span>
          </div>
        </div>

        {/* Cycle dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          {Array.from({ length: settings.longBreakAfter }).map((_, i) => (
            <span key={i} style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: i < (pomo.cycleCount % settings.longBreakAfter)
                ? accentColor
                : 'var(--border-strong)',
              border: `1.5px solid ${accentColor}66`,
              display: 'inline-block',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={pomo.reset}
            style={{
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: 16,
              transition: 'all var(--transition-fast)',
            }}
            title="Reset"
          >
            {SVGIcons.reset}
          </button>

          <button
            onClick={pomo.isRunning ? pomo.pause : pomo.start}
            style={{
              background: accentColor,
              border: 'none',
              borderRadius: '50%',
              width: 52,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 18,
              transition: 'opacity 0.2s',
            }}
            title={pomo.isRunning ? 'Pause' : 'Play'}
          >
            {pomo.isRunning ? SVGIcons.pause : SVGIcons.play}
          </button>

          <button
            onClick={pomo.skip}
            style={{
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: 16,
              transition: 'all var(--transition-fast)',
            }}
            title="Skip"
          >
            {SVGIcons.skip}
          </button>
        </div>

        <style>{`
          @keyframes pomo-modal-in {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `}</style>
      </div>
    </>
  );
};

export default PomodoroModal;
