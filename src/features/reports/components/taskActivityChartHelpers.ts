import { dateUtils } from '@/utils/dateUtils';
import type { Task } from '@/types';

export type ChartPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ActivityData {
  label: string;
  createdCount: number;
  completedCount: number;
  overdueCount: number;
  dateLabel: string;
}

// Chuyen doi Date -> YYYY-MM-DD de so sanh voi dueDate
export function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// So sanh 2 ngay co cung ngay thang nam hay khong
export function isSameDayDate(dateStr: string | null | undefined, targetDate: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
}

// Kiem tra xem mot task co bi tre han vao mot ngay targetDate hay khong
export function isOverdueOnDay(task: Task, targetDate: Date): boolean {
  if (!task.dueDate) return false;
  
  // Chuyen targetDate va dueDate ve YYYY-MM-DD de so sanh
  const targetStr = toYYYYMMDD(targetDate);
  const dueStr = task.dueDate.split('T')[0];
  
  if (dueStr !== targetStr) return false;

  // Neu chua hoan thanh -> Tre han
  if (!task.completed || !task.completedAt) return true;

  // Neu da hoan thanh nhung hoan thanh sau ngay targetDate (23:59:59.999)
  const completedDate = new Date(task.completedAt);
  const endOfTargetDate = new Date(targetDate);
  endOfTargetDate.setHours(23, 59, 59, 999);
  
  return completedDate > endOfTargetDate;
}

// Build daily data (24h)
export function buildActivityDailyData(tasks: Task[], date: Date): ActivityData[] {
  const bars: ActivityData[] = Array.from({ length: 24 }, (_, h) => {
    const timeLabel = `${h}h`;
    const formattedDate = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return {
      label: timeLabel,
      createdCount: 0,
      completedCount: 0,
      overdueCount: 0,
      dateLabel: `${formattedDate} ${h}:00`,
    };
  });

  tasks.forEach((t) => {
    // Tao moi trong ngay va gio tuong ung
    if (isSameDayDate(t.createdAt, date)) {
      const h = new Date(t.createdAt).getHours();
      bars[h].createdCount += 1;
    }

    // Hoan thanh trong ngay va gio tuong ung
    if (t.completedAt && isSameDayDate(t.completedAt, date)) {
      const h = new Date(t.completedAt).getHours();
      bars[h].completedCount += 1;
    }
  });

  // Task tre han cua ngay hom do (gan vao gio cuoi cung cua ngay)
  let overdueToday = 0;
  tasks.forEach((t) => {
    if (isOverdueOnDay(t, date)) {
      overdueToday += 1;
    }
  });
  bars[23].overdueCount = overdueToday;

  return bars;
}

// Build weekly data (Thu 2 -> Chu Nhat)
export function buildActivityWeeklyData(tasks: Task[], date: Date): ActivityData[] {
  const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const startOfWeek = new Date(date);
  const dayOfWeek = date.getDay();
  // Lay ngay dau tuan (Thu 2)
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(date.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  return DAYS.map((label, idx) => {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(startOfWeek.getDate() + idx);
    const dateStr = currentDay.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let createdCount = 0;
    let completedCount = 0;
    let overdueCount = 0;

    tasks.forEach((t) => {
      if (isSameDayDate(t.createdAt, currentDay)) {
        createdCount += 1;
      }
      if (t.completedAt && isSameDayDate(t.completedAt, currentDay)) {
        completedCount += 1;
      }
      if (isOverdueOnDay(t, currentDay)) {
        overdueCount += 1;
      }
    });

    return {
      label,
      createdCount,
      completedCount,
      overdueCount,
      dateLabel: dateStr,
    };
  });
}

// Build monthly data (cac ngay trong thang)
export function buildActivityMonthlyData(tasks: Task[], date: Date): ActivityData[] {
  const daysInMonth = dateUtils.getDaysInMonth(date.getFullYear(), date.getMonth());
  const bars: ActivityData[] = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const currentDay = new Date(date.getFullYear(), date.getMonth(), i);
    const dateStr = currentDay.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let createdCount = 0;
    let completedCount = 0;
    let overdueCount = 0;

    tasks.forEach((t) => {
      if (isSameDayDate(t.createdAt, currentDay)) {
        createdCount += 1;
      }
      if (t.completedAt && isSameDayDate(t.completedAt, currentDay)) {
        completedCount += 1;
      }
      if (isOverdueOnDay(t, currentDay)) {
        overdueCount += 1;
      }
    });

    bars.push({
      label: String(i),
      createdCount,
      completedCount,
      overdueCount,
      dateLabel: dateStr,
    });
  }

  return bars;
}

// Build yearly data (12 thang)
export function buildActivityYearlyData(tasks: Task[], date: Date): ActivityData[] {
  const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const year = date.getFullYear();

  return MONTHS.map((label, idx) => {
    let createdCount = 0;
    let completedCount = 0;
    let overdueCount = 0;

    tasks.forEach((t) => {
      // Tao moi trong thang idx
      const createdDate = new Date(t.createdAt);
      if (createdDate.getFullYear() === year && createdDate.getMonth() === idx) {
        createdCount += 1;
      }

      // Hoan thanh trong thang idx
      if (t.completedAt) {
        const completedDate = new Date(t.completedAt);
        if (completedDate.getFullYear() === year && completedDate.getMonth() === idx) {
          completedCount += 1;
        }
      }

      // Tre han trong thang idx (tuc la dueDate thuoc thang idx va bi tre han)
      if (t.dueDate) {
        const dueDate = new Date(t.dueDate);
        if (dueDate.getFullYear() === year && dueDate.getMonth() === idx) {
          // Kiem tra tre han: chua xong hoac hoan thanh muon hon cuoi thang idx
          const endOfMonth = new Date(year, idx + 1, 0, 23, 59, 59, 999);
          if (!t.completed || !t.completedAt || new Date(t.completedAt) > endOfMonth) {
            overdueCount += 1;
          }
        }
      }
    });

    return {
      label,
      createdCount,
      completedCount,
      overdueCount,
      dateLabel: `${label} năm ${year}`,
    };
  });
}

// Ve bieu do hoat dong tren Canvas
export function drawActivityChart(canvas: HTMLCanvasElement, data: ActivityData[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const paddingLeft = 44;
  const paddingRight = 24;
  const paddingBottom = 28;
  const paddingTop = 16;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingBottom - paddingTop;

  // Tim gia tri lon nhat de lam ti le
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.createdCount, d.completedCount, d.overdueCount)),
    1
  );

  // 1. Ve cac duong luoi (gridlines) va nhan truc Y
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

    // Y label
    const val = Math.round((i / gridLines) * maxVal);
    ctx.fillStyle = '#888';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(val), paddingLeft - 6, y + 3);
  }

  const barCount = data.length;
  const slotW = chartW / barCount;
  const gap = 3;
  // Bieu do cot 3 thanh ke nhau: Tao moi, Hoan thanh, Tre han
  const barW = Math.max(1, (slotW - gap * 2) / 3 - 0.5);

  // Colors
  const createdColor = '#f4a261'; // Cam (Tạo mới)
  const completedColor = '#4361ee'; // Xanh duong (Hoàn thành)
  const overdueColor = '#f25f5c'; // Do (Trễ hạn)

  // 2. Ve bieu do cot
  data.forEach((item, i) => {
    const xSlot = paddingLeft + i * slotW;

    // Cot 1: Tao moi (Created)
    if (item.createdCount > 0) {
      const barH = (item.createdCount / maxVal) * chartH;
      const x = xSlot + gap;
      const y = paddingTop + chartH - barH;
      ctx.fillStyle = createdColor;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]);
      ctx.fill();
    }

    // Cot 2: Hoan thanh (Completed)
    if (item.completedCount > 0) {
      const barH = (item.completedCount / maxVal) * chartH;
      const x = xSlot + gap + barW + 0.5;
      const y = paddingTop + chartH - barH;
      ctx.fillStyle = completedColor;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]);
      ctx.fill();
    }

    // Cot 3: Tre han (Overdue)
    if (item.overdueCount > 0) {
      const barH = (item.overdueCount / maxVal) * chartH;
      const x = xSlot + gap + (barW + 0.5) * 2;
      const y = paddingTop + chartH - barH;
      ctx.fillStyle = overdueColor;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]);
      ctx.fill();
    }

    // Nhan truc X
    const step = Math.ceil(barCount / 10);
    if (i % step === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, xSlot + slotW / 2, height - 8);
    }
  });
}
