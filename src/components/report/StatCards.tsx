// ============================================================
// FOCUS TO-DO - StatCards
// 6 thẻ thống kê trên đầu trang Report
// ============================================================
import React, { useMemo } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAppContext } from '../../contexts/AppContext';
import { dateUtils } from '../../utils/dateUtils';

// ----------------------------------------------------------
// Helpers tính thời gian tuần hiện tại
// ----------------------------------------------------------
function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const startOfWeek = new Date(now);
  // Tuần bắt đầu từ Thứ Hai
  const diff = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(now.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return { start: startOfWeek, end: endOfWeek };
}

function isInWeek(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const { start, end } = getWeekRange();
  return d >= start && d <= end;
}

function isToday(dateStr: string | null): boolean {
  return dateUtils.isToday(dateStr);
}

// ----------------------------------------------------------
// Kiểu dữ liệu card
// ----------------------------------------------------------
interface StatCardData {
  label: string;
  value: string;
  color: 'red' | 'blue';
}

// ----------------------------------------------------------
// StatCard component đơn lẻ
// ----------------------------------------------------------
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

      {/* Value */}
      <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 26, lineHeight: 1 }}>
        {data.value}
      </div>
      {/* Label */}
      <div style={{ color: 'var(--text-tertiary)', fontSize: 11, letterSpacing: 0.5, lineHeight: 1.4 }}>
        {data.label}
      </div>
    </div>
  );
};

// ----------------------------------------------------------
// StatCards - component chính
// ----------------------------------------------------------
interface StatCardsProps {
  accentRed?: string;
  accentBlue?: string;
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
}

const StatCards: React.FC<StatCardsProps> = ({
  accentRed = '#f25f5c',
  accentBlue = '#4cc9f0',
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
}) => {
  const { tasks, projects, pomodoroSessions, pomodoroRecords } = useTaskContext();
  const { settings } = useAppContext();

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

    // ---- Total Focus Time (phút): nguồn sự thật = task.totalFocusTime ----
    // (thời gian thực, không bị cap 200 như session)
    const totalFocusTime = filteredTasks.reduce((acc, t) => acc + (t.totalFocusTime ?? 0), 0);

    // ---- Week/Today: chỉ session mới có mốc thời gian (startTime) ----
    const focusSessions = pomodoroSessions
      .filter((s) => s.type === 'focus')
      .filter((s) => s.taskId && filteredTaskIds.has(s.taskId));

    const weekFocusTime = focusSessions
      .filter((s) => isInWeek(s.startTime))
      .reduce((acc, s) => acc + (s.duration ?? 0), 0);

    const todayFocusTime = focusSessions
      .filter((s) => isToday(s.startTime))
      .reduce((acc, s) => acc + (s.duration ?? 0), 0);

    // ---- Completed tasks ----
    const totalCompleted = filteredTasks.filter((t) => t.completed).length;

    const weekCompleted = filteredTasks.filter(
      (t) => t.completed && isInWeek(t.completedAt),
    ).length;

    const todayCompleted = filteredTasks.filter(
      (t) => t.completed && isToday(t.completedAt),
    ).length;

    // ---- On-time Completion Rate ----
    // Chỉ tính trên task đã hoàn thành CÓ dueDate; không có thì hiển thị '—'
    const completedTasks = filteredTasks.filter(t => t.completed);
    const tasksWithDueDate = completedTasks.filter(t => t.dueDate);
    let onTimeRate: number | null = null;
    if (tasksWithDueDate.length > 0) {
      const onTimeTasks = tasksWithDueDate.filter(t => {
        if (!t.completedAt || !t.dueDate) return false;
        // Compare dates without time
        const due = new Date(t.dueDate);
        due.setHours(23, 59, 59, 999);
        const comp = new Date(t.completedAt);
        return comp <= due;
      });
      onTimeRate = Math.round((onTimeTasks.length / tasksWithDueDate.length) * 100);
    }

    // ---- Actual vs Estimated (theo phút thực) ----
    // actual = Σ totalFocusTime; est = Σ (pomodoroEstimate × pomodoroLength)
    let estVsAct: number | null = null;
    const tasksWithEstimate = completedTasks.filter(t => t.pomodoroEstimate && t.pomodoroEstimate > 0);
    if (tasksWithEstimate.length > 0) {
      const pomoLen = settings.pomodoroLength || 25;
      let totalEstMin = 0;
      let totalActMin = 0;
      tasksWithEstimate.forEach(t => {
        totalEstMin += t.pomodoroEstimate * pomoLen;
        totalActMin += (t.totalFocusTime ?? 0);
      });
      estVsAct = totalEstMin > 0 ? Math.round((totalActMin / totalEstMin) * 100) : null;
    }

    // ---- Interruption Rate ----
    // Chỉ xét record đã KẾT THÚC (có endTime); loại record đang chạy
    let interruptionRate: number | null = null;
    const finishedRecords = pomodoroRecords.filter(
      r => r.taskId && filteredTaskIds.has(r.taskId) && r.endTime,
    );
    if (finishedRecords.length > 0) {
      const interrupted = finishedRecords.filter(r => !r.completed);
      interruptionRate = Math.round((interrupted.length / finishedRecords.length) * 100);
    }

    return {
      totalFocusTime,
      weekFocusTime,
      todayFocusTime,
      totalCompleted,
      weekCompleted,
      todayCompleted,
      onTimeRate,
      estVsAct,
      interruptionRate,
    };
  }, [tasks, projects, pomodoroSessions, pomodoroRecords, settings.pomodoroLength, selectedFolderId, selectedProjectId, selectedTagId]);

  // Định dạng phút -> h hoặc h m
  function fmtMin(minutes: number): string {
    return dateUtils.formatDuration(Math.round(minutes));
  }

  const cards: StatCardData[] = [
    {
      label: 'Total Focus Time',
      value: fmtMin(stats.totalFocusTime),
      color: 'red',
    },
    {
      label: 'Focus Time This Week',
      value: fmtMin(stats.weekFocusTime),
      color: 'red',
    },
    {
      label: 'Focus Time Today',
      value: fmtMin(stats.todayFocusTime),
      color: 'red',
    },
    {
      label: 'Total Completed Tasks',
      value: String(stats.totalCompleted),
      color: 'blue',
    },
    {
      label: 'Completed This Week',
      value: String(stats.weekCompleted),
      color: 'blue',
    },
    {
      label: 'Completed Today',
      value: String(stats.todayCompleted),
      color: 'blue',
    },
    {
      label: 'On-time Rate',
      value: stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%`,
      color: 'blue',
    },
    {
      label: 'Actual / Est.',
      value: stats.estVsAct === null ? '—' : `${stats.estVsAct}%`,
      color: 'blue',
    },
    {
      label: 'Interruption Rate',
      value: stats.interruptionRate === null ? '—' : `${stats.interruptionRate}%`,
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
