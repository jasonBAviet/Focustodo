import type { ChartPeriod } from './FocusTimeChart';

export function getPeriodRange(period: ChartPeriod, date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);

  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly': {
      const day = date.getDay();
      // Tuần bắt đầu từ Thứ Hai (nếu là Chủ Nhật day === 0 thì lùi 6 ngày)
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(date.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      
      // Đặt ngày kết thúc
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      end.setDate(1);
      end.setMonth(date.getMonth() + 1);
      end.setDate(0); // Ngày cuối cùng của tháng hiện tại
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }
  return { start, end };
}

export function getPeriodLabel(period: ChartPeriod, date: Date): string {
  switch (period) {
    case 'daily':
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    case 'weekly': {
      const { start, end } = getPeriodRange('weekly', date);
      return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }
    case 'monthly':
      return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    case 'yearly':
      return `Năm ${date.getFullYear()}`;
  }
}

// Chuyển Date -> YYYY-MM-DD
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Chuyển YYYY-MM-DD -> Date
export function parseDateString(str: string): Date {
  if (!str) return new Date();
  const parts = str.split('-');
  if (parts.length !== 3) return new Date();
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}
