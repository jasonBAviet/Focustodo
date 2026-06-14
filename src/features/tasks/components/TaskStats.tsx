import React from 'react';
import { useInjectedStyle } from '@/shared/hooks/useInjectedStyle';

const STAT_CARD_CSS = `
      .stat-card { display: flex; flex-direction: column; gap: var(--space-1); }
      .stat-card__value { font-size: var(--text-2xl); font-weight: 700; line-height: 1; }
      .stat-card__label { font-size: var(--text-xs); color: var(--text-tertiary); }
`;

export const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({
  label, value, color,
}) => {
  useInjectedStyle('stat-card', STAT_CARD_CSS);
  return (
    <div className="stat-card">
      <span className="stat-card__value" style={{ color: color || 'var(--stat-red)' }}>
        {value}
      </span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
};

export const TaskStatsRow: React.FC<{
  isCompletedView: boolean;
  isMobile: boolean;
  todayCompleted: number;
  weekCompleted: number;
  totalCompleted: number;
  totalFocusAll: number;
  totalEstimatedMin: number;
  activeCount: number;
  totalElapsedMin: number;
  completedCount: number;
}> = (props) => {
  const formatStatTime = (min: number) => {
    if (min === 0) return '0m';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (props.isCompletedView) {
    return (
      <div className="main-stats-row">
        <StatCard label={props.isMobile ? 'Today' : 'Completed Today'} value={props.todayCompleted} color="var(--stat-blue)" />
        <StatCard label={props.isMobile ? 'Week' : 'Completed This Week'} value={props.weekCompleted} color="var(--stat-blue)" />
        <StatCard label={props.isMobile ? 'Total' : 'Total Completed'} value={props.totalCompleted} color="var(--stat-blue)" />
        <StatCard label={props.isMobile ? 'Focus' : 'Total Focus Time'} value={formatStatTime(props.totalFocusAll)} />
      </div>
    );
  }

  return (
    <div className="main-stats-row">
      <StatCard label={props.isMobile ? 'Est.' : 'Estimated Time'} value={formatStatTime(props.totalEstimatedMin)} />
      <StatCard label={props.isMobile ? 'To-do' : 'Tasks to Complete'} value={props.activeCount} />
      <StatCard label={props.isMobile ? 'Elapsed' : 'Elapsed Time'} value={props.totalElapsedMin > 0 ? formatStatTime(props.totalElapsedMin) : '0m'} color="var(--stat-orange)" />
      <StatCard label={props.isMobile ? 'Done' : 'Completed Tasks'} value={props.completedCount} color="var(--stat-blue)" />
    </div>
  );
};
