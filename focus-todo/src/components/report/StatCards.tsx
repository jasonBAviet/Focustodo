// ============================================================
// FOCUS TO-DO - StatCards
// 6 thẻ thống kê trên đầu trang Report
// ============================================================
import React, { useMemo } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
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

const StatCard: React.FC<StatCardProps> = ({ data, accentRed, accentBlue }) => {
  const color = data.color === 'red' ? accentRed : accentBlue;
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
}

const StatCards: React.FC<StatCardsProps> = ({
  accentRed = '#f25f5c',
  accentBlue = '#4cc9f0',
}) => {
  const { tasks, pomodoroSessions } = useTaskContext();

  const stats = useMemo(() => {
    // ---- Focus Time (phút) - tính từ pomodoro session thật ----
    const focusSessions = pomodoroSessions.filter((s) => s.type === 'focus');

    const totalFocusTime = focusSessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);

    const weekFocusTime = focusSessions
      .filter((s) => isInWeek(s.startTime))
      .reduce((acc, s) => acc + (s.duration ?? 0), 0);

    const todayFocusTime = focusSessions
      .filter((s) => isToday(s.startTime))
      .reduce((acc, s) => acc + (s.duration ?? 0), 0);

    // ---- Completed tasks ----
    const totalCompleted = tasks.filter((t) => t.completed).length;

    const weekCompleted = tasks.filter(
      (t) => t.completed && isInWeek(t.completedAt),
    ).length;

    const todayCompleted = tasks.filter(
      (t) => t.completed && isToday(t.completedAt),
    ).length;

    return {
      totalFocusTime,
      weekFocusTime,
      todayFocusTime,
      totalCompleted,
      weekCompleted,
      todayCompleted,
    };
  }, [tasks, pomodoroSessions]);

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
