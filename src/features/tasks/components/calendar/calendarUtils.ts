// ============================================================
// FOCUS TO-DO - calendarUtils.ts
// Calendar calculations for Calendar View
// ============================================================

export interface CalendarDayInfo {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateString: string; // YYYY-MM-DD
}

export const calendarUtils = {
  // Returns number of days in a month (month is 0-indexed)
  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  },

  // Converts Date object to YYYY-MM-DD string in local time
  toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // Checks if two dates are on the same day/month/year
  isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  },

  // Gets a list of 42 days (6 weeks) to display in month view (starts on Monday)
  getMonthGrid(year: number, month: number): CalendarDayInfo[] {
    const grid: CalendarDayInfo[] = [];
    const firstDay = new Date(year, month, 1);
    
    // Day of the week of the first day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = firstDay.getDay();
    
    // Number of days to go back into the previous month so it starts on Monday
    // If the first day is Sunday (0), go back 6 days.
    // If it's Monday (1), go back 0 days.
    // If it's Tuesday (2), go back 1 day...
    const daysBefore = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const startDate = new Date(year, month, 1 - daysBefore);
    const today = new Date();

    // Generate grid of 42 days (6 weeks) to ensure consistent month grid UI
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

  // Gets the 7 days of the week containing the given date (starts on Monday)
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
