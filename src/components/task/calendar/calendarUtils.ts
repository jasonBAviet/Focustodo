// ============================================================
// FOCUS TO-DO - calendarUtils.ts
// Các tiện ích tính toán lịch cho Calendar View
// ============================================================

export interface CalendarDayInfo {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateString: string; // YYYY-MM-DD
}

export const calendarUtils = {
  // Trả về số ngày của một tháng (tháng 0-indexed)
  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  },

  // Chuyển đối tượng Date thành chuỗi YYYY-MM-DD theo giờ địa phương
  toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // Kiểm tra xem hai ngày có cùng ngày/tháng/năm hay không
  isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  },

  // Lấy danh sách 42 ngày (6 tuần) hiển thị trong chế độ xem tháng (bắt đầu từ Thứ 2)
  getMonthGrid(year: number, month: number): CalendarDayInfo[] {
    const grid: CalendarDayInfo[] = [];
    const firstDay = new Date(year, month, 1);
    
    // Ngày trong tuần của ngày đầu tiên (0 = Chủ Nhật, 1 = Thứ 2, ..., 6 = Thứ 7)
    const dayOfWeek = firstDay.getDay();
    
    // Số ngày cần lùi về tháng trước để bắt đầu từ Thứ Hai
    // Nếu ngày đầu tiên là Chủ Nhật (0), cần lùi 6 ngày.
    // Nếu là Thứ Hai (1), lùi 0 ngày.
    // Nếu là Thứ Ba (2), lùi 1 ngày...
    const daysBefore = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const startDate = new Date(year, month, 1 - daysBefore);
    const today = new Date();

    // Sinh lưới 42 ngày (6 tuần) để đảm bảo giao diện tháng luôn đồng đều
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      grid.push({
        date: currentDate,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: this.isSameDay(currentDate, today),
        dateString: this.toDateString(currentDate),
      });
    }

    return grid;
  },

  // Lấy danh sách 7 ngày trong tuần chứa ngày được chọn (bắt đầu từ Thứ 2)
  getWeekDays(date: Date): CalendarDayInfo[] {
    const days: CalendarDayInfo[] = [];
    const dayOfWeek = date.getDay();
    const daysBefore = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysBefore);
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);

      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isToday: this.isSameDay(currentDate, today),
        dateString: this.toDateString(currentDate),
      });
    }

    return days;
  },
};
