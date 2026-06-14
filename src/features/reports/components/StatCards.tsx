import React, { useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useKnowledgeContext } from '@/features/knowledge/KnowledgeContext';
import { dateUtils } from '@/utils/dateUtils';
import type { ChartPeriod } from '@/features/reports/components/FocusTimeChart';

function isInRange(dateStr: string | null, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

interface StatCardsProps {
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
  startDate: Date;
  endDate: Date;
  period: ChartPeriod;
}

const StatCards: React.FC<StatCardsProps> = ({
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
  startDate,
  endDate,
  period,
}) => {
  const { tasks, projects, pomodoroSessions, pomodoroRecords } = useTaskContext();
  const { knowledges } = useKnowledgeContext();

  const stats = useMemo(() => {
    const applyCommonFilters = (task: typeof tasks[number]) => {
      if (selectedFolderId !== 'all') {
        if (!task.projectId) return false;
        const project = projects.find((p) => p.id === task.projectId);
        if (!project || project.folderId !== selectedFolderId) return false;
      }
      if (selectedProjectId !== 'all') {
        if (task.projectId !== selectedProjectId) return false;
      }
      if (selectedTagId !== 'all') {
        if (!task.tags || !task.tags.includes(selectedTagId)) return false;
      }
      return true;
    };

    const filteredTasks = tasks.filter((t) => applyCommonFilters(t));
    const filteredAllItems = [...tasks, ...knowledges].filter(applyCommonFilters);

    const filteredTaskIds = new Set(filteredTasks.map((t) => t.id));

    const totalFocusTime = filteredTasks.reduce((acc, t) => acc + (t.totalFocusTime ?? 0), 0);

    const focusSessions = pomodoroSessions
      .filter((s) => s.type === 'focus')
      .filter((s) => s.taskId && filteredTaskIds.has(s.taskId));

    const periodFocusTime = focusSessions
      .filter((s) => isInRange(s.startTime, startDate, endDate))
      .reduce((acc, s) => acc + (s.duration ?? 0), 0);

    const periodCreated = filteredTasks.filter((t) => isInRange(t.createdAt, startDate, endDate)).length;
    const totalCompleted = filteredTasks.filter((t) => t.completed).length;
    const periodCompleted = filteredTasks.filter(
      (t) => t.completed && isInRange(t.completedAt, startDate, endDate),
    ).length;
    const periodKnowledgeCreated = knowledges.filter(
      (k) => isInRange(k.createdAt, startDate, endDate) && applyCommonFilters(k)
    ).length;
    const overdueCount = filteredTasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(23, 59, 59, 999);
      return due < endDate;
    }).length;

    const completedTasksInPeriod = filteredTasks.filter(
      (t) => t.completed && t.completedAt && isInRange(t.completedAt, startDate, endDate),
    );
    let avgCompletionTimeStr = '—';
    if (completedTasksInPeriod.length > 0) {
      let totalMs = 0;
      completedTasksInPeriod.forEach((t) => {
        if (t.completedAt) {
          const created = new Date(t.createdAt).getTime();
          const completed = new Date(t.completedAt).getTime();
          totalMs += Math.max(0, completed - created);
        }
      });
      const avgDays = totalMs / (1000 * 60 * 60 * 24) / completedTasksInPeriod.length;
      if (avgDays < 1) {
        avgCompletionTimeStr = `${Math.round(avgDays * 24 * 10) / 10} hours`;
      } else {
        avgCompletionTimeStr = `${Math.round(avgDays * 10) / 10} days`;
      }
    }

    const tasksWithDueDate = completedTasksInPeriod.filter((t) => t.dueDate);
    let onTimeRate: number | null = null;
    if (tasksWithDueDate.length > 0) {
      const onTimeTasks = tasksWithDueDate.filter((t) => {
        if (!t.completedAt || !t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(23, 59, 59, 999);
        return new Date(t.completedAt) <= due;
      });
      onTimeRate = Math.round((onTimeTasks.length / tasksWithDueDate.length) * 100);
    }

    let interruptionRate: number | null = null;
    const finishedRecords = pomodoroRecords.filter(
      (r) => r.taskId && filteredTaskIds.has(r.taskId) && r.endTime && isInRange(r.startTime, startDate, endDate),
    );
    if (finishedRecords.length > 0) {
      const interrupted = finishedRecords.filter((r) => !r.completed);
      interruptionRate = Math.round((interrupted.length / finishedRecords.length) * 100);
    }

    return {
      totalFocusTime,
      periodFocusTime,
      periodCreated,
      totalCompleted,
      periodCompleted,
      periodKnowledgeCreated,
      overdueCount,
      avgCompletionTimeStr,
      onTimeRate,
      interruptionRate,
    };
  }, [tasks, knowledges, projects, pomodoroSessions, pomodoroRecords, selectedFolderId, selectedProjectId, selectedTagId, startDate, endDate]);

  function fmtMin(minutes: number): string {
    return dateUtils.formatDuration(Math.round(minutes));
  }

  let periodLabel = 'In period';
  if (period === 'daily') periodLabel = 'Today';
  else if (period === 'weekly') periodLabel = 'This week';
  else if (period === 'monthly') periodLabel = 'This month';
  else if (period === 'yearly') periodLabel = 'This year';

  const warningColor = '#f25f5c';
  const successColor = '#06d6a0';
  const primaryColor = '#4cc9f0';
  const accentColor = '#f25f5c';

  const groupIcons: Record<string, React.ReactNode> = {
    'Time': (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    'Tasks': (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    'Quality': (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  };

  const groups: Array<{
    groupLabel: string;
    accent: string;
    cards: Array<{ label: string; value: string; warning?: boolean }>;
  }> = [
    {
      groupLabel: 'Time',
      accent: accentColor,
      cards: [
        { label: `Focus (${periodLabel})`, value: fmtMin(stats.periodFocusTime) },
        { label: 'Total focus', value: fmtMin(stats.totalFocusTime) },
      ],
    },
    {
      groupLabel: 'Tasks',
      accent: primaryColor,
      cards: [
        { label: `Created (${periodLabel})`, value: String(stats.periodCreated) },
        { label: `Completed (${periodLabel})`, value: String(stats.periodCompleted) },
        { label: 'Total completed', value: String(stats.totalCompleted) },
        { label: `Knowledge (${periodLabel})`, value: String(stats.periodKnowledgeCreated) },
      ],
    },
    {
      groupLabel: 'Quality',
      accent: successColor,
      cards: [
        { label: `Avg Lead Time (${periodLabel})`, value: stats.avgCompletionTimeStr },
        { label: `On time (${periodLabel})`, value: stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%` },
        {
          label: 'Overdue (end of period)',
          value: String(stats.overdueCount),
          warning: stats.overdueCount > 0,
        },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 4 }}>
      {groups.map((group) => (
        <div key={group.groupLabel}>
          {/* Group header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 8,
          }}>
            <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
              {groupIcons[group.groupLabel]}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--text-secondary)',
            }}>
              {group.groupLabel}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--divider)', marginLeft: 4 }} />
          </div>

          {/* Cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}>
            {group.cards.map((card) => (
              <div key={card.label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <div style={{
                  color: card.warning ? warningColor : group.accent,
                  fontWeight: 700,
                  fontSize: 22,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}>
                  {card.value}
                </div>
                <div style={{
                  color: 'var(--text-tertiary)',
                  fontSize: 10,
                  lineHeight: 1.4,
                }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
