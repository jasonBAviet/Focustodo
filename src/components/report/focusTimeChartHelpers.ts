import { dateUtils } from '../../utils/dateUtils';
import type { PomodoroSession } from '../../types';

export type ChartPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface BarData {
  label: string;
  minutes: number;
}

export function buildDailyData(sessions: PomodoroSession[], date: Date): BarData[] {
  const bars: BarData[] = Array.from({ length: 24 }, (_, h) => ({
    label: `${h}h`,
    minutes: 0,
  }));
  sessions.forEach((s) => {
    if (!s.startTime) return;
    const d = new Date(s.startTime);
    if (dateUtils.isSameDay(d.toISOString(), date.toISOString())) {
      bars[d.getHours()].minutes += s.duration ?? 0;
    }
  });
  return bars;
}

export function buildWeeklyData(sessions: PomodoroSession[], date: Date): BarData[] {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const bars: BarData[] = DAYS.map((l) => ({ label: l, minutes: 0 }));
  const startOfWeek = new Date(date);
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(date.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  sessions.forEach((s) => {
    if (!s.startTime) return;
    const d = new Date(s.startTime);
    const diffDays = Math.floor(
      (d.getTime() - startOfWeek.getTime()) / 86400000,
    );
    if (diffDays >= 0 && diffDays < 7) {
      bars[diffDays].minutes += s.duration ?? 0;
    }
  });
  return bars;
}

export function buildMonthlyData(sessions: PomodoroSession[], date: Date): BarData[] {
  const daysInMonth = dateUtils.getDaysInMonth(date.getFullYear(), date.getMonth());
  const bars: BarData[] = Array.from({ length: daysInMonth }, (_, i) => ({
    label: String(i + 1),
    minutes: 0,
  }));
  sessions.forEach((s) => {
    if (!s.startTime) return;
    const d = new Date(s.startTime);
    if (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth()
    ) {
      bars[d.getDate() - 1].minutes += s.duration ?? 0;
    }
  });
  return bars;
}

export function buildYearlyData(sessions: PomodoroSession[], date: Date): BarData[] {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const bars: BarData[] = MONTHS.map((l) => ({ label: l, minutes: 0 }));
  sessions.forEach((s) => {
    if (!s.startTime) return;
    const d = new Date(s.startTime);
    if (d.getFullYear() === date.getFullYear()) {
      bars[d.getMonth()].minutes += s.duration ?? 0;
    }
  });
  return bars;
}

export function buildBarData(
  sessions: PomodoroSession[],
  period: ChartPeriod,
  currentDate: Date,
): BarData[] {
  switch (period) {
    case 'daily':   return buildDailyData(sessions, currentDate);
    case 'weekly':  return buildWeeklyData(sessions, currentDate);
    case 'monthly': return buildMonthlyData(sessions, currentDate);
    case 'yearly':  return buildYearlyData(sessions, currentDate);
  }
}

export function getPeriodLabel(period: ChartPeriod, date: Date): string {
  switch (period) {
    case 'daily':
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    case 'weekly': {
      const start = new Date(date);
      const diff = date.getDay() === 0 ? -6 : 1 - date.getDay();
      start.setDate(date.getDate() + diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
    }
    case 'monthly':
      return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    case 'yearly':
      return String(date.getFullYear());
  }
}

export function drawChart(
  canvas: HTMLCanvasElement,
  bars: BarData[],
  accentColor: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const paddingLeft = 44;
  const paddingBottom = 28;
  const paddingTop = 16;
  const chartW = width - paddingLeft - 12;
  const chartH = height - paddingBottom - paddingTop;

  const maxMinutes = Math.max(...bars.map((b) => b.minutes), 1);

  // Kẻ lưới ngang
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = paddingTop + chartH - (i / gridLines) * chartH;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + chartW, y);
    ctx.stroke();
    // Nhãn trục Y
    const val = Math.round((i / gridLines) * maxMinutes);
    ctx.fillStyle = '#777';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val > 0 ? `${val}m` : '0', paddingLeft - 4, y + 4);
  }

  // Cột
  const barCount = bars.length;
  const gap = 3;
  const barW = Math.max(2, (chartW - gap * (barCount - 1)) / barCount);

  bars.forEach((bar, i) => {
    const barH = bar.minutes > 0
      ? Math.max(2, (bar.minutes / maxMinutes) * chartH)
      : 0;
    const x = paddingLeft + i * (barW + gap);
    const y = paddingTop + chartH - barH;

    // Gradient
    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, accentColor);
    grad.addColorStop(1, accentColor + '55');
    ctx.fillStyle = barH > 0 ? grad : 'transparent';
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
    ctx.fill();

    // Nhãn trục X - chỉ hiển thị 1 số nhãn đủ chỗ
    const step = Math.ceil(barCount / 12);
    if (i % step === 0) {
      ctx.fillStyle = '#777';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bar.label, x + barW / 2, height - 8);
    }
  });
}
