import React, { useState } from 'react';
import type { Task } from '@/types';
import { useInjectedStyle } from '@/shared/hooks/useInjectedStyle';
import PomodoroScrollPicker from '@/shared/components/PomodoroScrollPicker';

const DETAIL_ROW_CSS = `
      .detail-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 0; border-bottom: 1px solid var(--divider);
        font-size: var(--text-sm); min-height: 40px;
        position: relative;
      }
      .detail-row__icon { color: var(--text-tertiary); flex-shrink: 0; width: 16px; }
      .detail-row__label { color: var(--text-secondary); flex: 1; }
      .detail-row__value { color: var(--text-primary); font-size: var(--text-sm); }
`;

export const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => {
  useInjectedStyle('detail-row', DETAIL_ROW_CSS);
  return (
    <div className="detail-row">
      <span className="detail-row__icon">{icon}</span>
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value">{children}</span>
    </div>
  );
};

export const PomodoroRow: React.FC<{ task: Task; onUpdate: (estimate: number) => void }> = ({ task, onUpdate }) => {
  const [showPicker, setShowPicker] = useState(false);
  const POMO_DURATION = 25;

  return (
    <>
      <DetailRow
        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>}
        label="Pomodoro"
      >
        <button
          className="pomo-trigger"
          title="Edit Pomodoros"
          onClick={() => setShowPicker(true)}
        >
          <span className="pomo-trigger__count">{task.pomodoroEstimate || 0}</span>
          <span className="pomo-trigger__meta">
            {task.pomodoroCompleted}/{task.pomodoroEstimate || 0} = {(task.pomodoroEstimate || 0) * POMO_DURATION}m
          </span>
        </button>
        <style>{`
          .pomo-trigger {
            display: flex; align-items: center; gap: 8px;
            background: none; border: none; cursor: pointer;
            padding: 2px 4px; border-radius: 6px;
            transition: background var(--transition-fast);
          }
          .pomo-trigger:hover { background: var(--bg-card-hover); }
          .pomo-trigger__count {
            font-weight: 600; font-size: 15px;
            color: var(--text-primary); min-width: 18px; text-align: center;
            font-family: var(--font-main);
          }
          .pomo-trigger__meta {
            font-size: var(--text-xs); color: var(--text-tertiary);
          }
        `}</style>
      </DetailRow>
      {showPicker && (
        <PomodoroScrollPicker
          estimate={task.pomodoroEstimate || 0}
          pomoDuration={POMO_DURATION}
          onEstimateChange={(est) => {
            onUpdate(est);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
};
