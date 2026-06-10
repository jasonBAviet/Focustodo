import { dateUtils } from '../../utils/dateUtils';
import type { Task } from '../../types';

export type ChartPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CompletionBarData {
  label: string;
  tasksCompleted: number;
  subtasksCompleted: number;
  cumulativeGrowth: number;
}

// Check if a date string falls in the same day as targetDate
export function isSameDay(dateStr: string | null | undefined, targetDate: Date): boolean {
  if (!dateStr) return false;
  return dateUtils.isSameDay(dateStr, targetDate.toISOString());
}

// Build daily data (24 hours)
export function buildDailyData(tasks: Task[], subtasks: { completedAt: string }[], date: Date): CompletionBarData[] {
  const bars: CompletionBarData[] = Array.from({ length: 24 }, (_, h) => ({
    label: `${h}h`,
    tasksCompleted: 0,
    subtasksCompleted: 0,
    cumulativeGrowth: 0,
  }));

  tasks.forEach((t) => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    if (isSameDay(t.completedAt, date)) {
      bars[d.getHours()].tasksCompleted += 1;
    }
  });

  subtasks.forEach((s) => {
    const d = new Date(s.completedAt);
    if (isSameDay(s.completedAt, date)) {
      bars[d.getHours()].subtasksCompleted += 1;
    }
  });

  // Calculate cumulative growth
  let sum = 0;
  bars.forEach((b) => {
    sum += b.tasksCompleted + b.subtasksCompleted;
    b.cumulativeGrowth = sum;
  });

  return bars;
}

// Build weekly data (Mon - Sun)
export function buildWeeklyData(tasks: Task[], subtasks: { completedAt: string }[], date: Date): CompletionBarData[] {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const bars: CompletionBarData[] = DAYS.map((l) => ({
    label: l,
    tasksCompleted: 0,
    subtasksCompleted: 0,
    cumulativeGrowth: 0,
  }));

  const startOfWeek = new Date(date);
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(date.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  tasks.forEach((t) => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    const diffDays = Math.floor((d.getTime() - startOfWeek.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      bars[diffDays].tasksCompleted += 1;
    }
  });

  subtasks.forEach((s) => {
    const d = new Date(s.completedAt);
    const diffDays = Math.floor((d.getTime() - startOfWeek.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      bars[diffDays].subtasksCompleted += 1;
    }
  });

  let sum = 0;
  bars.forEach((b) => {
    sum += b.tasksCompleted + b.subtasksCompleted;
    b.cumulativeGrowth = sum;
  });

  return bars;
}

// Build monthly data (days in month)
export function buildMonthlyData(tasks: Task[], subtasks: { completedAt: string }[], date: Date): CompletionBarData[] {
  const daysInMonth = dateUtils.getDaysInMonth(date.getFullYear(), date.getMonth());
  const bars: CompletionBarData[] = Array.from({ length: daysInMonth }, (_, i) => ({
    label: String(i + 1),
    tasksCompleted: 0,
    subtasksCompleted: 0,
    cumulativeGrowth: 0,
  }));

  tasks.forEach((t) => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    if (d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth()) {
      bars[d.getDate() - 1].tasksCompleted += 1;
    }
  });

  subtasks.forEach((s) => {
    const d = new Date(s.completedAt);
    if (d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth()) {
      bars[d.getDate() - 1].subtasksCompleted += 1;
    }
  });

  let sum = 0;
  bars.forEach((b) => {
    sum += b.tasksCompleted + b.subtasksCompleted;
    b.cumulativeGrowth = sum;
  });

  return bars;
}

// Build yearly data (12 months)
export function buildYearlyData(tasks: Task[], subtasks: { completedAt: string }[], date: Date): CompletionBarData[] {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const bars: CompletionBarData[] = MONTHS.map((l) => ({
    label: l,
    tasksCompleted: 0,
    subtasksCompleted: 0,
    cumulativeGrowth: 0,
  }));

  tasks.forEach((t) => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    if (d.getFullYear() === date.getFullYear()) {
      bars[d.getMonth()].tasksCompleted += 1;
    }
  });

  subtasks.forEach((s) => {
    const d = new Date(s.completedAt);
    if (d.getFullYear() === date.getFullYear()) {
      bars[d.getMonth()].subtasksCompleted += 1;
    }
  });

  let sum = 0;
  bars.forEach((b) => {
    sum += b.tasksCompleted + b.subtasksCompleted;
    b.cumulativeGrowth = sum;
  });

  return bars;
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

// Draw chart on canvas
export function drawChart(canvas: HTMLCanvasElement, bars: CompletionBarData[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const paddingLeft = 44;
  const paddingRight = 44;
  const paddingBottom = 28;
  const paddingTop = 16;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingBottom - paddingTop;

  // Find max values for scales
  const maxCompleted = Math.max(...bars.map(b => Math.max(b.tasksCompleted, b.subtasksCompleted)), 1);
  const maxGrowth = Math.max(...bars.map(b => b.cumulativeGrowth), 1);

  // 1. Draw gridlines & Left scale (Completed Count) & Right scale (Cumulative Growth)
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = paddingTop + chartH - (i / gridLines) * chartH;
    
    // Grid line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + chartW, y);
    ctx.stroke();

    // Left Y label (Tasks/Subtasks Completed)
    const valLeft = Math.round((i / gridLines) * maxCompleted);
    ctx.fillStyle = '#888';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(valLeft), paddingLeft - 6, y + 3);

    // Right Y label (Cumulative Growth)
    const valRight = Math.round((i / gridLines) * maxGrowth);
    ctx.fillStyle = '#06d6a0'; // green line color
    ctx.textAlign = 'left';
    ctx.fillText(String(valRight), paddingLeft + chartW + 6, y + 3);
  }

  const barCount = bars.length;
  const gap = 4;
  const slotW = chartW / barCount;
  const barW = Math.max(1, (slotW - gap) / 2 - 1);

  // Colors
  const taskColor = '#4361ee'; // Royal Blue
  const subtaskColor = '#90e0ef'; // Sky Blue
  const growthColor = '#06d6a0'; // Green

  // 2. Draw Bars (Cột kép Tasks & Subtasks)
  bars.forEach((bar, i) => {
    const xSlot = paddingLeft + i * slotW;

    // Draw Task Bar
    if (bar.tasksCompleted > 0) {
      const taskBarH = (bar.tasksCompleted / maxCompleted) * chartH;
      const xTask = xSlot + gap / 2;
      const yTask = paddingTop + chartH - taskBarH;
      ctx.fillStyle = taskColor;
      ctx.beginPath();
      ctx.roundRect(xTask, yTask, barW, taskBarH, [2, 2, 0, 0]);
      ctx.fill();
    }

    // Draw Subtask Bar
    if (bar.subtasksCompleted > 0) {
      const subtaskBarH = (bar.subtasksCompleted / maxCompleted) * chartH;
      const xSub = xSlot + gap / 2 + barW + 1;
      const ySub = paddingTop + chartH - subtaskBarH;
      ctx.fillStyle = subtaskColor;
      ctx.beginPath();
      ctx.roundRect(xSub, ySub, barW, subtaskBarH, [2, 2, 0, 0]);
      ctx.fill();
    }

    // X-axis label
    const step = Math.ceil(barCount / 10);
    if (i % step === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bar.label, xSlot + slotW / 2, height - 8);
    }
  });

  // 3. Draw Cumulative Growth Line (Đường Line lũy kế)
  ctx.beginPath();
  ctx.strokeStyle = growthColor;
  ctx.lineWidth = 2;
  
  bars.forEach((bar, i) => {
    const xSlot = paddingLeft + i * slotW;
    const xPoint = xSlot + slotW / 2;
    const yPoint = paddingTop + chartH - (bar.cumulativeGrowth / maxGrowth) * chartH;
    
    if (i === 0) {
      ctx.moveTo(xPoint, yPoint);
    } else {
      ctx.lineTo(xPoint, yPoint);
    }
  });
  ctx.stroke();

  // Draw points on the line
  bars.forEach((bar, i) => {
    const xSlot = paddingLeft + i * slotW;
    const xPoint = xSlot + slotW / 2;
    const yPoint = paddingTop + chartH - (bar.cumulativeGrowth / maxGrowth) * chartH;

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = growthColor;
    ctx.lineWidth = 2;
    ctx.arc(xPoint, yPoint, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });
}
