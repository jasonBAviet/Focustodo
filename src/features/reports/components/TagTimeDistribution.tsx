import React, { useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { dateUtils } from '@/utils/dateUtils';
import { getTagTimeDistribution } from '@/features/reports/components/tagDistributionHelpers';

interface TagTimeDistributionProps {
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
  startDate: Date;
  endDate: Date;
}

const TagTimeDistribution: React.FC<TagTimeDistributionProps> = ({
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
  startDate,
  endDate,
}) => {
  const { tasks, tags, projects, pomodoroSessions } = useTaskContext();

  const slices = useMemo(() => {
    return getTagTimeDistribution(
      tasks,
      tags,
      { selectedFolderId, selectedProjectId, selectedTagId, startDate, endDate },
      projects,
      pomodoroSessions
    );
  }, [tasks, tags, selectedFolderId, selectedProjectId, selectedTagId, projects, startDate, endDate, pomodoroSessions]);

  if (slices.length === 0) {
    return (
      <div className="report-empty">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="4" width="32" height="32" rx="4" stroke="var(--border-strong)" strokeWidth="1.5" />
          <path d="M12 20h4v8h-4zM18 14h4v14h-4zM24 17h4v11h-4z" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Không có dữ liệu</span>
      </div>
    );
  }

  const total = slices.reduce((acc, s) => acc + s.minutes, 0);
  const max = Math.max(...slices.map((s) => s.minutes), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {slices.map((s) => {
        const pct = total > 0 ? Math.round((s.minutes / total) * 100) : 0;
        const barPct = (s.minutes / max) * 100;
        return (
          <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
              </span>
              <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {dateUtils.formatDuration(s.minutes)} · {pct}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 6, background: 'var(--glass-bg)', overflow: 'hidden' }}>
              <div style={{ width: `${barPct}%`, height: '100%', background: s.color, borderRadius: 6, transition: 'width 0.3s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TagTimeDistribution;
