// ============================================================
// FOCUS TO-DO - ProjectTimeDistribution
// Phân bổ thời gian focus theo từng project (dữ liệu thật trong khoảng thời gian).
// ============================================================
import React, { useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { dateUtils } from '@/utils/dateUtils';

interface ProjectSlice {
  id: string;
  name: string;
  color: string;
  minutes: number;
}

interface ProjectTimeDistributionProps {
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
  startDate: Date;
  endDate: Date;
}

const ProjectTimeDistribution: React.FC<ProjectTimeDistributionProps> = ({
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
  startDate,
  endDate,
}) => {
  const { tasks, projects, pomodoroSessions } = useTaskContext();

  const slices = useMemo<ProjectSlice[]>(() => {
    // 1. Lọc các sessions trong khoảng thời gian [startDate, endDate]
    const sessionsInPeriod = pomodoroSessions.filter(s => {
      if (!s.startTime || s.type !== 'focus') return false;
      const sDate = new Date(s.startTime);
      return sDate >= startDate && sDate <= endDate;
    });

    // 2. Gom nhóm phút tập trung theo task
    const minutesByTask = new Map<string, number>();
    sessionsInPeriod.forEach(s => {
      if (s.taskId) {
        minutesByTask.set(s.taskId, (minutesByTask.get(s.taskId) ?? 0) + (s.duration ?? 0));
      }
    });

    // 3. Lọc task và gom phút theo dự án
    const minutesByProject = new Map<string, number>();
    
    tasks.forEach(task => {
      const mins = minutesByTask.get(task.id) ?? 0;
      if (mins <= 0) return;

      // Áp dụng bộ lọc dự án/thư mục/nhãn cho task
      if (selectedFolderId !== 'all') {
        if (!task.projectId) return;
        const project = projects.find((p) => p.id === task.projectId);
        if (!project || project.folderId !== selectedFolderId) return;
      }
      if (selectedProjectId !== 'all') {
        if (task.projectId !== selectedProjectId) return;
      }
      if (selectedTagId !== 'all') {
        if (!task.tags || !task.tags.includes(selectedTagId)) return;
      }

      const pid = task.projectId ?? 'inbox';
      minutesByProject.set(pid, (minutesByProject.get(pid) ?? 0) + mins);
    });

    const projectById = new Map(projects.map((p) => [p.id, p]));

    return Array.from(minutesByProject.entries())
      .map(([pid, minutes]) => {
        const proj = projectById.get(pid);
        return {
          id: pid,
          name: proj?.name ?? 'Inbox',
          color: proj?.color ?? '#7ec8e3',
          minutes: Math.round(minutes),
        };
      })
      .filter((s) => s.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
  }, [tasks, projects, pomodoroSessions, selectedFolderId, selectedProjectId, selectedTagId, startDate, endDate]);

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

export default ProjectTimeDistribution;
