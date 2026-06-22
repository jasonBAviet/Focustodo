// ============================================================
// FOCUS TO-DO - GoalCalendar
// Lịch hiển thị ngày đạt Focus Time Goal (hỗ trợ 1, 2, 3 tháng)
// ============================================================
import React, { useMemo, useState } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import type { PomodoroSession } from '@/types';

interface GoalCalendarProps {
  focusGoalHours: number;
  accentColor?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getFocusMinutesForDay = (focusMap: Map<string, number>, year: number, month: number, day: number) => {
  return focusMap.get(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`) ?? 0;
};

function buildFocusMap(sessions: PomodoroSession[]): Map<string, number> {
  const map = new Map<string, number>();
  sessions.forEach((s) => {
    if (s.type !== 'focus' || !s.startTime) return;
    const d = new Date(s.startTime);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + (s.duration ?? 0));
  });
  return map;
}

const getMonthInfo = (year: number, month: number, offset: number) => {
  const d = new Date(year, month + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};

// ============================================================
// Component hiển thị lịch của một tháng đơn lẻ
// ============================================================
const MonthView: React.FC<{
  year: number;
  month: number;
  focusMap: Map<string, number>;
  goalMinutes: number;
  accentColor: string;
}> = ({ year, month, focusMap, goalMinutes, accentColor }) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = useMemo(() => (new Date(year, month, 1).getDay() - 1 + 7) % 7, [year, month]);

  const cells = useMemo(() => {
    const list: Array<{ day: number; isCurrentMonth: boolean; dateKey: string }> = [];
    const prevInfo = getMonthInfo(year, month, -1);
    const daysInPrevMonth = new Date(prevInfo.year, prevInfo.month + 1, 0).getDate();
    
    for (let i = offset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      list.push({ day: d, isCurrentMonth: false, dateKey: `${prevInfo.year}-${String(prevInfo.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ day: d, isCurrentMonth: true, dateKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    const nextInfo = getMonthInfo(year, month, 1);
    let nextDay = 1;
    while (list.length < 42) {
      list.push({ day: nextDay, isCurrentMonth: false, dateKey: `${nextInfo.year}-${String(nextInfo.month + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}` });
      nextDay++;
    }
    return list;
  }, [year, month, offset, daysInMonth]);

  const { focusDays, completedGoalDays } = useMemo(() => {
    let fd = 0, cgd = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const mins = getFocusMinutesForDay(focusMap, year, month, d);
      if (mins > 0) fd++;
      if (mins >= goalMinutes) cgd++;
    }
    return { focusDays: fd, completedGoalDays: cgd };
  }, [focusMap, year, month, daysInMonth, goalMinutes]);

  const rate = focusDays > 0 ? Math.round((completedGoalDays / focusDays) * 100) : 0;
  const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{MONTH_NAMES[month]} {year}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 10, marginTop: 4, display: 'flex', justifyContent: 'center', gap: 6, fontWeight: 500 }}>
          <span>Focus Days: <strong style={{ color: 'var(--text-primary)' }}>{focusDays}</strong></span>
          <span>|</span>
          <span>Goal Days: <strong style={{ color: accentColor }}>{completedGoalDays}</strong></span>
          <span>|</span>
          <span>Rate: <strong style={{ color: '#4cc9f0' }}>{rate}%</strong></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600, padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((cell, idx) => {
          const { day, isCurrentMonth, dateKey } = cell;
          const mins = focusMap.get(dateKey) ?? 0;
          const isGoal = isCurrentMonth && mins >= goalMinutes && goalMinutes > 0;
          const hasFocus = isCurrentMonth && mins > 0;
          const todayObj = new Date();
          const isToday = isCurrentMonth && todayObj.getFullYear() === year && todayObj.getMonth() === month && todayObj.getDate() === day;

          return (
            <div
              key={`${dateKey}-${idx}`}
              title={isCurrentMonth && mins > 0 ? `${Math.round(mins)}m focus` : undefined}
              style={{
                aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                fontWeight: isToday ? 700 : (hasFocus ? 600 : 400), cursor: 'default',
                background: isGoal ? accentColor : (hasFocus ? `${accentColor}25` : 'transparent'),
                color: isGoal ? 'var(--text-on-accent)' : (!isCurrentMonth ? 'var(--text-disabled)' : (isToday ? accentColor : 'var(--text-primary)')),
                opacity: !isCurrentMonth ? 0.35 : 1,
                border: isToday && !isGoal ? `1.5px solid ${accentColor}` : '1.5px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// Component chính GoalCalendar
// ============================================================
const GoalCalendar: React.FC<GoalCalendarProps> = ({ focusGoalHours, accentColor = '#f25f5c' }) => {
  const { pomodoroSessions } = useTaskContext();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [monthsToShow, setMonthsToShow] = useState<number>(3);

  const focusMap = useMemo(() => buildFocusMap(pomodoroSessions), [pomodoroSessions]);
  const goalMinutes = focusGoalHours * 60;

  const navigate = (dir: -1 | 1) => {
    const nextInfo = getMonthInfo(viewYear, viewMonth, dir);
    setViewMonth(nextInfo.month);
    setViewYear(nextInfo.year);
  };

  const visibleMonths = useMemo(() => {
    if (monthsToShow === 1) return [{ year: viewYear, month: viewMonth }];
    if (monthsToShow === 2) return [getMonthInfo(viewYear, viewMonth, -1), { year: viewYear, month: viewMonth }];
    return [getMonthInfo(viewYear, viewMonth, -1), { year: viewYear, month: viewMonth }, getMonthInfo(viewYear, viewMonth, 1)];
  }, [viewYear, viewMonth, monthsToShow]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>Focus Time Goal</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => navigate(-1)} style={navBtnStyle}>‹</button>
            <button onClick={() => navigate(1)} style={navBtnStyle}>›</button>
            <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }} style={todayBtnStyle}>Today</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={monthsToShow} onChange={(e) => setMonthsToShow(Number(e.target.value))} style={selectStyle}>
            <option value={1}>1 Month</option>
            <option value={2}>2 Months</option>
            <option value={3}>3 Months</option>
          </select>
          <div style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}55`, borderRadius: 999, padding: '3px 12px', color: accentColor, fontSize: 12, fontWeight: 600 }}>
            Goal: {focusGoalHours}H
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', width: '100%', overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin', justifyContent: monthsToShow === 1 ? 'center' : 'flex-start' }}>
        {visibleMonths.map((m, idx) => (
          <div key={`${m.year}-${m.month}-${idx}`} style={{ flex: '0 0 240px' }}>
            <MonthView year={m.year} month={m.month} focusMap={focusMap} goalMinutes={goalMinutes} accentColor={accentColor} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap', borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
        <LegendItem color={accentColor} label="Goal reached" filled />
        <LegendItem color={`${accentColor}55`} label="Has focus" filled />
        <LegendItem color={accentColor} label="Today" filled={false} />
      </div>
    </div>
  );
};

// ============================================================
// Styles & Helper Components
// ============================================================
const LegendItem: React.FC<{ color: string; label: string; filled: boolean }> = ({ color, label, filled }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <div style={{ width: 12, height: 12, borderRadius: 4, background: filled ? color : 'transparent', border: filled ? 'none' : `2px solid ${color}` }} />
    <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{label}</span>
  </div>
);

const navBtnStyle: React.CSSProperties = {
  background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text-secondary)', fontSize: 16, width: 24, height: 24, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, transition: 'all 0.15s ease',
};

const todayBtnStyle: React.CSSProperties = {
  background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text-secondary)', fontSize: 11, height: 24, padding: '0 8px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, transition: 'all 0.15s ease',
};

const selectStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 11, fontWeight: 500, outline: 'none', cursor: 'pointer',
};

export default GoalCalendar;
