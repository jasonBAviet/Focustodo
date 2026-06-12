// ============================================================
// FOCUS TO-DO - StatCards
// Thống kê trên đầu trang Report, được lọc theo khoảng thời gian global
// ============================================================
import React, { useMemo } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { dateUtils } from '../../utils/dateUtils';
import type { ChartPeriod } from './FocusTimeChart';

function isInRange(dateStr: string | null, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

interface StatCardData {
  label: string;
  value: string;
  color: 'red' | 'blue';
}

interface StatCardProps {
  data: StatCardData;
  accentRed: string;
  accentBlue: string;
}

const StatCard: React.FC<StatCardProps> = ({ data }) => {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
      borderRadius: 14,
      padding: '16px 20px',
      minWidth: 140,
      flex: '1 1 140px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 26, lineHeight: 1 }}>
        {data.value}
      </div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 11, letterSpacing: 0.5, lineHeight: 1.4 }}>
        {data.label}
      </div>
    </div>
  );
};

interface StatCardsProps {
  accentRed?: string;
  accentBlue?: string;
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
  startDate: Date;
  endDate: Date;
  period: ChartPeriod;
}

const StatCards: React.FC<StatCardsProps> = ({
  accentRed = '#f25f5c',
  accentBlue = '#4cc9f0',
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
  startDate,
  endDate,
  period,
}) => {
  const { tasks, projects, pomodoroSessions, pomodoroRecords } = useTaskContext();

  const stats = useMemo(() => {
    // ---- Lọc danh sách task theo bộ lọc chọn ----
    const filteredTasks = tasks.filter((task) => {
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
    });

    const filteredTaskIds = new Set(filteredTasks.map((t) => t.id));

    // ---- Total Focus Time (phút) tích lũy ----
    const totalFocusTime = filteredTasks.reduce((acc, t) => acc + (t.totalFocusTime ?? 0), 0);

    // ---- Lọc session focus thuộc bộ lọc dự án/nhãn ----
    const focusSessions = pomodoroSessions
      .filter((s) => s.type === 'focus')
      .filter((s) => s.taskId && filteredTaskIds.has(s.taskId));

    // Focus time trong kỳ
    const periodFocusTime = focusSessions
      .filter((s) => isInRange(s.startTime, startDate, endDate))
      .reduce((acc, s) => acc + (s.duration ?? 0), 0);

    // ---- Task Created trong kỳ ----
    const periodCreated = filteredTasks.filter(
      (t) => isInRange(t.createdAt, startDate, endDate)
    ).length;

    // ---- Completed tasks ----
    const totalCompleted = filteredTasks.filter((t) => t.completed).length;

    const periodCompleted = filteredTasks.filter(
      (t) => t.completed && isInRange(t.completedAt, startDate, endDate)
    ).length;

    // ---- Knowledge Created trong kỳ ----
    const periodKnowledgeCreated = filteredTasks.filter(
      (t) => t.isKnowledge && isInRange(t.createdAt, startDate, endDate)
    ).length;

    // ---- Overdue Tasks tính đến ngày endDate ----
    const overdueCount = filteredTasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(23, 59, 59, 999);
      return due < endDate;
    }).length;

    // ---- Lead Time (Thời gian hoàn thành trung bình) ----
    const completedTasksInPeriod = filteredTasks.filter(
      (t) => t.completed && t.completedAt && isInRange(t.completedAt, startDate, endDate)
    );
    let avgCompletionTimeStr = '—';
    if (completedTasksInPeriod.length > 0) {
      let totalMs = 0;
      completedTasksInPeriod.forEach(t => {
        if (t.completedAt) {
          const created = new Date(t.createdAt).getTime();
          const completed = new Date(t.completedAt).getTime();
          totalMs += Math.max(0, completed - created);
        }
      });
      const avgDays = totalMs / (1000 * 60 * 60 * 24) / completedTasksInPeriod.length;
      if (avgDays < 1) {
        const avgHours = Math.round(avgDays * 24 * 10) / 10;
        avgCompletionTimeStr = `${avgHours} giờ`;
      } else {
        const avgDaysRounded = Math.round(avgDays * 10) / 10;
        avgCompletionTimeStr = `${avgDaysRounded} ngày`;
      }
    }

    // ---- On-time Completion Rate trong kỳ ----
    const tasksWithDueDate = completedTasksInPeriod.filter(t => t.dueDate);
    let onTimeRate: number | null = null;
    if (tasksWithDueDate.length > 0) {
      const onTimeTasks = tasksWithDueDate.filter(t => {
        if (!t.completedAt || !t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(23, 59, 59, 999);
        const comp = new Date(t.completedAt);
        return comp <= due;
      });
      onTimeRate = Math.round((onTimeTasks.length / tasksWithDueDate.length) * 100);
    }

    // ---- Interruption Rate trong kỳ ----
    let interruptionRate: number | null = null;
    const finishedRecords = pomodoroRecords.filter(
      r => r.taskId && filteredTaskIds.has(r.taskId) && r.endTime && isInRange(r.startTime, startDate, endDate)
    );
    if (finishedRecords.length > 0) {
      const interrupted = finishedRecords.filter(r => !r.completed);
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
  }, [tasks, projects, pomodoroSessions, pomodoroRecords, selectedFolderId, selectedProjectId, selectedTagId, startDate, endDate]);

  function fmtMin(minutes: number): string {
    return dateUtils.formatDuration(Math.round(minutes));
  }

  // Nhãn động dựa trên period
  let periodLabel = 'Trong kỳ';
  if (period === 'daily') periodLabel = 'Ngày này';
  else if (period === 'weekly') periodLabel = 'Tuần này';
  else if (period === 'monthly') periodLabel = 'Tháng này';
  else if (period === 'yearly') periodLabel = 'Năm này';

  const cards: StatCardData[] = [
    {
      label: `Thời gian tập trung (${periodLabel})`,
      value: fmtMin(stats.periodFocusTime),
      color: 'red',
    },
    {
      label: 'Tổng thời gian tập trung',
      value: fmtMin(stats.totalFocusTime),
      color: 'red',
    },
    {
      label: `Số task mới tạo (${periodLabel})`,
      value: String(stats.periodCreated),
      color: 'blue',
    },
    {
      label: `Task đã hoàn thành (${periodLabel})`,
      value: String(stats.periodCompleted),
      color: 'blue',
    },
    {
      label: 'Tổng task đã hoàn thành',
      value: String(stats.totalCompleted),
      color: 'blue',
    },
    {
      label: `Kiến thức đã tạo (${periodLabel})`,
      value: String(stats.periodKnowledgeCreated),
      color: 'blue',
    },
    {
      label: `Lead Time TB (${periodLabel})`,
      value: stats.avgCompletionTimeStr,
      color: 'blue',
    },
    {
      label: `Tỉ lệ đúng hạn (${periodLabel})`,
      value: stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%`,
      color: 'blue',
    },
    {
      label: 'Số task trễ hạn (Cuối kỳ)',
      value: String(stats.overdueCount),
      color: 'red',
    },
  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      padding: '0 0 4px',
    }}>
      {cards.map((card) => (
        <StatCard
          key={card.label}
          data={card}
          accentRed={accentRed}
          accentBlue={accentBlue}
        />
      ))}
    </div>
  );
};

export default StatCards;
