// ============================================================
// FOCUS TO-DO - GoalCalendar
// Lịch hiển thị ngày đạt Focus Time Goal
// ============================================================
import React, { useMemo, useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { dateUtils } from '../../utils/dateUtils';

// ----------------------------------------------------------
// Props
// ----------------------------------------------------------
interface GoalCalendarProps {
  focusGoalHours: number;
  accentColor?: string;
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------
const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

/** Tổng focus time (phút) của tất cả tasks được cập nhật vào ngày d */
function getFocusMinutesForDay(
  tasksMap: Map<string, number>,
  year: number,
  month: number,
  day: number,
): number {
  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return tasksMap.get(key) ?? 0;
}

/** Xây dựng map: 'YYYY-MM-DD' -> tổng focus phút */
function buildFocusMap(tasks: ReturnType<typeof useTaskContext>['tasks']): Map<string, number> {
  const map = new Map<string, number>();
  tasks.forEach((t) => {
    if (!t.updatedAt && !t.completedAt) return;
    const dateStr = t.completedAt ?? t.updatedAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + (t.totalFocusTime ?? 0));
  });
  return map;
}

function isTodayDate(year: number, month: number, day: number): boolean {
  const now = new Date();
  return (
    now.getFullYear() === year &&
    now.getMonth() === month &&
    now.getDate() === day
  );
}

/** Trả về số ngày (1-indexed) bắt đầu tuần của ngày 1 tháng (0=Sun..6=Sat -> 0=Mon..6=Sun) */
function getFirstDayOfMonthOffset(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=CN, 1=T2, ..., 6=T7
}

// ----------------------------------------------------------
// GoalCalendar
// ----------------------------------------------------------
const GoalCalendar: React.FC<GoalCalendarProps> = ({
  focusGoalHours,
  accentColor = '#f25f5c',
}) => {
  const { tasks } = useTaskContext();
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const focusMap = useMemo(() => buildFocusMap(tasks), [tasks]);
  const daysInMonth = dateUtils.getDaysInMonth(viewYear, viewMonth);
  const firstOffset = getFirstDayOfMonthOffset(viewYear, viewMonth);
  const goalMinutes = focusGoalHours * 60;

  // Tính các thống kê
  const { focusDays, completedGoalDays } = useMemo(() => {
    let fd = 0;
    let cgd = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const mins = getFocusMinutesForDay(focusMap, viewYear, viewMonth, d);
      if (mins > 0) fd++;
      if (mins >= goalMinutes) cgd++;
    }
    return { focusDays: fd, completedGoalDays: cgd };
  }, [focusMap, viewYear, viewMonth, daysInMonth, goalMinutes]);

  const rate = focusDays > 0
    ? Math.round((completedGoalDays / focusDays) * 100)
    : 0;

  // Điều hướng tháng
  const navigate = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  // Build grid cells
  const totalCells = Math.ceil((firstOffset + daysInMonth) / 7) * 7;
  const cells: Array<number | null> = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstOffset + 1;
    return dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null;
  });

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '18px 20px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>
          Focus Time Goal
        </span>
        <div style={{
          background: `${accentColor}22`,
          border: `1px solid ${accentColor}55`,
          borderRadius: 999,
          padding: '3px 12px',
          color: accentColor,
          fontSize: 12,
          fontWeight: 600,
        }}>
          Goal: {focusGoalHours}h
        </div>
      </div>

      {/* Sub stats */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <StatChip label="Focus Days" value={focusDays} color="#ccc" />
        <StatChip label="Goal Days" value={completedGoalDays} color={accentColor} />
        <StatChip label="Rate" value={`${rate}%`} color="#4cc9f0" />
      </div>

      {/* Tháng navigation */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <button onClick={() => navigate(-1)} style={navBtn()}>‹</button>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button onClick={() => navigate(1)} style={navBtn()}>›</button>
      </div>

      {/* Day headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2, marginBottom: 4,
      }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{
            textAlign: 'center', color: 'var(--text-secondary)', fontSize: 10,
            fontWeight: 600, letterSpacing: 0.5, padding: '2px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3,
      }}>
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} style={{ aspectRatio: '1', borderRadius: 8 }} />;
          }
          const mins = getFocusMinutesForDay(focusMap, viewYear, viewMonth, day);
          const isGoal = mins >= goalMinutes && goalMinutes > 0;
          const hasFocus = mins > 0;
          const isToday = isTodayDate(viewYear, viewMonth, day);

          return (
            <div
              key={day}
              title={mins > 0 ? `${Math.round(mins)}m focus` : undefined}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: isToday ? 700 : hasFocus ? 600 : 400,
                cursor: 'default',
                background: isGoal
                  ? accentColor
                  : hasFocus
                  ? `${accentColor}33`
                  : 'transparent',
                color: isGoal
                  ? 'var(--text-on-accent)'
                  : isToday
                  ? accentColor
                  : 'var(--text-secondary)',
                border: isToday && !isGoal
                  ? `1.5px solid ${accentColor}`
                  : '1.5px solid transparent',
                transition: 'background 0.2s',
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 14, marginTop: 14,
        flexWrap: 'wrap',
      }}>
        <LegendItem color={accentColor} label="Goal reached" filled />
        <LegendItem color={`${accentColor}55`} label="Has focus" filled />
        <LegendItem color={accentColor} label="Today" filled={false} />
      </div>
    </div>
  );
};

// ----------------------------------------------------------
// Sub components
// ----------------------------------------------------------
function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 10, letterSpacing: 0.5 }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontSize: 15 }}>{value}</span>
    </div>
  );
}

function LegendItem({ color, label, filled }: { color: string; label: string; filled: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 12, height: 12, borderRadius: 4,
        background: filled ? color : 'transparent',
        border: filled ? 'none' : `2px solid ${color}`,
      }} />
      <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{label}</span>
    </div>
  );
}

function navBtn(): React.CSSProperties {
  return {
    background: 'var(--glass-bg)',
    border: 'none',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    fontSize: 18,
    width: 28,
    height: 28,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
  };
}

export default GoalCalendar;
