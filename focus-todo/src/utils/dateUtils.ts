// Date utility functions
export const dateUtils = {
  now(): string {
    return new Date().toISOString();
  },

  format(dateStr: string | null, short = false): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      if (short) {
        const day = d.getDate();
        const month = d.toLocaleString('en', { month: 'short' });
        return `${day} ${month}`;
      }
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return '';
    }
  },

  formatShort(dateStr: string | null): string {
    return this.format(dateStr, true);
  },

  isToday(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  },

  isTomorrow(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear()
    );
  },

  isThisWeek(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  },

  isOverdue(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d < new Date();
  },

  isSameDay(a: string, b: string): boolean {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  },

  startOfDay(dateStr: string): Date {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  startOfWeek(dateStr?: string): Date {
    const d = dateStr ? new Date(dateStr) : new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  startOfMonth(dateStr?: string): Date {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  },

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  },

  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  },

  toDateInputValue(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
  },

  fromDateInput(value: string): string {
    return new Date(value).toISOString();
  },
};
