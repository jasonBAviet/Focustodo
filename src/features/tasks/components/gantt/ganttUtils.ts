import type { Task } from '@/types';
import { dateUtils } from '@/utils/dateUtils';

export type GanttPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface GanttColumn {
  date: Date;
  label: string;
  subLabel: string;
  isToday: boolean;
  isWeekStart?: boolean;
  isMonthStart?: boolean;
}

/**
 * Cộng/trừ số tháng vào một ngày, giữ nguyên "ngày trong tháng" nếu tháng đích
 * đủ dài, hoặc giới hạn về ngày cuối cùng của tháng đích nếu ngắn hơn.
 * Tránh lỗi tràn tháng của Date.setMonth (ví dụ 31/1 + 1 tháng sẽ tự nhảy
 * sang đầu tháng 3 thay vì 28/2, vì JS Date không tự giới hạn ngày).
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInTargetMonth));
  return result;
}

/**
 * Lấy danh sách các cột thời gian cho trục X của Gantt Chart
 */
export function getGanttColumns(period: GanttPeriod, referenceDate: Date, rangeValue?: number): GanttColumn[] {
  const columns: GanttColumn[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === 'daily') {
    const totalDays = rangeValue || 7;
    const half = Math.floor(totalDays / 2);
    const startOffset = -half;
    const endOffset = totalDays - 1 - half;

    for (let i = startOffset; i <= endOffset; i++) {
      const d = new Date(referenceDate);
      d.setDate(referenceDate.getDate() + i);
      d.setHours(0, 0, 0, 0);
      columns.push({
        date: d,
        label: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
        subLabel: String(d.getDate()).padStart(2, '0'),
        isToday: d.getTime() === today.getTime(),
        isWeekStart: d.getDay() === 1,
        isMonthStart: d.getDate() === 1,
      });
    }
  } else if (period === 'weekly') {
    const totalWeeks = rangeValue || 1;
    const startOfWeek = new Date(referenceDate);
    const day = referenceDate.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 1 là Thứ Hai
    startOfWeek.setDate(referenceDate.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const halfWeeks = Math.floor(totalWeeks / 2);
    startOfWeek.setDate(startOfWeek.getDate() - halfWeeks * 7);

    for (let i = 0; i < totalWeeks * 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      columns.push({
        date: d,
        label: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
        subLabel: String(d.getDate()).padStart(2, '0'),
        isToday: d.getTime() === today.getTime(),
        isWeekStart: d.getDay() === 1,
        isMonthStart: d.getDate() === 1,
      });
    }
  } else if (period === 'monthly') {
    const totalMonths = rangeValue || 1;
    const halfMonths = Math.floor(totalMonths / 2);
    const startMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - halfMonths, 1);

    for (let m = 0; m < totalMonths; m++) {
      const currentMonthDate = new Date(startMonthDate.getFullYear(), startMonthDate.getMonth() + m, 1);
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        columns.push({
          date: d,
          label: d.toLocaleDateString('vi-VN', { weekday: 'narrow' }),
          subLabel: String(i).padStart(2, '0'),
          isToday: d.getTime() === today.getTime(),
          isWeekStart: d.getDay() === 1,
          isMonthStart: d.getDate() === 1,
        });
      }
    }
  } else if (period === 'yearly') {
    const totalYears = rangeValue || 1;
    const halfYears = Math.floor(totalYears / 2);
    const startYear = referenceDate.getFullYear() - halfYears;

    for (let y = 0; y < totalYears; y++) {
      const year = startYear + y;
      for (let i = 0; i < 12; i++) {
        const d = new Date(year, i, 1);
        columns.push({
          date: d,
          label: `Tháng ${i + 1}`,
          subLabel: String(year),
          isToday: d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth(),
          isWeekStart: false,
          isMonthStart: i === 0,
        });
      }
    }
  }

  return columns;
}

/**
 * Tính toán tiến độ công việc (%)
 */
export function getTaskProgress(task: Task): number {
  if (task.completed) return 100;
  if (!task.subtasks || task.subtasks.length === 0) return 0;
  const completedSubtasks = task.subtasks.filter(sub => sub.completed).length;
  return Math.round((completedSubtasks / task.subtasks.length) * 100);
}

/**
 * Xác định khoảng ngày biểu đồ: ngày bắt đầu và kết thúc của dải cột
 */
export function getGanttRange(columns: GanttColumn[], period: GanttPeriod): { start: Date; end: Date } {
  if (columns.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }
  const start = new Date(columns[0].date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(columns[columns.length - 1].date);
  if (period === 'yearly') {
    // Cuối tháng của tháng cuối cùng
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
  }
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export interface GanttBarPositionDetails {
  left: number;
  width: number;
  isVisible: boolean;
  actualWidth: number;
  dueDateLeft: number | null;
  hasConnector: boolean;
  connectorLeft: number;
  connectorWidth: number;
  isLate: boolean;
  lateLeft: number;
  lateWidth: number;
  status: 'not-started' | 'in-progress' | 'overdue' | 'completed-early-or-on-time' | 'completed-late';
  daysDiff: number;
}

/**
 * Tính toán vị trí % (left và width) cho thanh Gantt Bar của Task so với khoảng thời gian của lưới trục X
 * đồng thời phân tích các phân đoạn kế hoạch, trễ hạn, quá hạn và ngày hoàn thành thực tế.
 */
export function getGanttBarPosition(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date
): GanttBarPositionDetails {
  // 1. Xác định mốc bắt đầu thực tế/kế hoạch và mốc hạn chót
  // Cùng thứ tự ưu tiên với bộ lọc ở GanttView (startDate -> dueDate -> createdAt)
  // để một task chỉ có hạn chót (không có ngày bắt đầu) được neo đúng vào hạn chót
  // thay vì kéo dài thanh Gantt về tận ngày tạo.
  const taskStartStr = task.startDate || task.dueDate || task.createdAt;
  if (!taskStartStr) {
    return {
      left: 0,
      width: 0,
      isVisible: false,
      actualWidth: 0,
      dueDateLeft: null,
      hasConnector: false,
      connectorLeft: 0,
      connectorWidth: 0,
      isLate: false,
      lateLeft: 0,
      lateWidth: 0,
      status: 'in-progress',
      daysDiff: 0,
    };
  }

  const today = new Date();
  let endStr = today.toISOString();
  if (task.completed) {
    endStr = task.completedAt || task.dueDate || task.startDate || task.createdAt || today.toISOString();
  }

  let taskStart = new Date(taskStartStr);
  if (task.completed && task.completedAt) {
    const completedDate = new Date(task.completedAt);
    if (completedDate < taskStart) {
      taskStart = completedDate;
    }
  }
  taskStart.setHours(0, 0, 0, 0);

  const end = new Date(endStr);
  end.setHours(23, 59, 59, 999);

  let due: Date | null = null;
  if (task.dueDate) {
    due = new Date(task.dueDate);
    due.setHours(23, 59, 59, 999);
  }

  // 2. Xác định mốc thời gian kết thúc bao phủ rộng nhất của task
  const taskEnd = due ? new Date(Math.max(due.getTime(), end.getTime())) : new Date(end.getTime());

  // 3. Kiểm tra xem task có nằm ngoài dải hiển thị của Gantt Chart không
  if (taskEnd.getTime() < rangeStart.getTime() || taskStart.getTime() > rangeEnd.getTime()) {
    return {
      left: 0,
      width: 0,
      isVisible: false,
      actualWidth: 0,
      dueDateLeft: null,
      hasConnector: false,
      connectorLeft: 0,
      connectorWidth: 0,
      isLate: false,
      lateLeft: 0,
      lateWidth: 0,
      status: 'in-progress',
      daysDiff: 0,
    };
  }

  // 4. Cắt bớt phần hiển thị ngoài dải trục X của biểu đồ
  const cStart = new Date(Math.max(taskStart.getTime(), rangeStart.getTime()));
  const cEnd = new Date(Math.min(taskEnd.getTime(), rangeEnd.getTime()));

  const totalDuration = rangeEnd.getTime() - rangeStart.getTime();
  if (totalDuration <= 0) {
    return {
      left: 0,
      width: 0,
      isVisible: false,
      actualWidth: 0,
      dueDateLeft: null,
      hasConnector: false,
      connectorLeft: 0,
      connectorWidth: 0,
      isLate: false,
      lateLeft: 0,
      lateWidth: 0,
      status: 'in-progress',
      daysDiff: 0,
    };
  }

  const left = ((cStart.getTime() - rangeStart.getTime()) / totalDuration) * 100;
  const rawWidth = ((cEnd.getTime() - cStart.getTime()) / totalDuration) * 100;
  // Đảm bảo độ rộng tối thiểu 2% để thanh luôn nhìn thấy được, nhưng không
  // bao giờ vượt quá mép phải của lưới (100 - left) khi bar nằm sát rangeEnd.
  const width = Math.min(Math.max(rawWidth, 2), Math.max(100 - left, 0));

  // 5. Tính toán phần trăm tương đối của các đoạn bên trong container
  const containerDuration = cEnd.getTime() - cStart.getTime();
  const getPct = (d: Date) => {
    const t = d.getTime();
    if (containerDuration <= 0) return 0;
    return Math.max(0, Math.min(100, ((t - cStart.getTime()) / containerDuration) * 100));
  };

  const actualWidth = due && end.getTime() > due.getTime() ? getPct(due) : getPct(end);
  const dueDateLeft = due ? getPct(due) : null;

  // Đường chỉ dẫn nét đứt nối từ điểm hoàn thành thực tế đến hạn chót,
  // chỉ hiển thị khi hoàn thành sớm (end trước due).
  const hasConnector = due !== null && end.getTime() < due.getTime();
  const connectorLeft = hasConnector ? getPct(end) : 0;
  const connectorWidth = hasConnector && due ? (getPct(due) - getPct(end)) : 0;

  const isLate = due !== null && end.getTime() > due.getTime();
  const lateLeft = isLate && due ? getPct(due) : 0;
  const lateWidth = isLate ? (getPct(end) - (due ? getPct(due) : 0)) : 0;

  // 6. Tính toán trạng thái và số ngày chênh lệch
  const status = dateUtils.calculateTaskStatus(task.completed, task.startDate, task.dueDate, task.completedAt);
  let daysDiff = 0;

  if (due) {
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);
    const diffTime = endDay.getTime() - dueDay.getTime();
    daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    left,
    width,
    isVisible: true,
    actualWidth,
    dueDateLeft,
    hasConnector,
    connectorLeft,
    connectorWidth,
    isLate,
    lateLeft,
    lateWidth,
    status,
    daysDiff,
  };
}
