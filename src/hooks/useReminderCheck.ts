// ============================================================
// FOCUS TO-DO - useReminderCheck
// Hook kiểm tra task cần remind và gửi webhook
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import type { Task } from '../types';

interface UseReminderCheckParams {
  tasks: Task[];
  webhookEnabled: boolean;
  onTaskReminded: (task: Task) => void;
}

export function useReminderCheck({
  tasks,
  webhookEnabled,
  onTaskReminded,
}: UseReminderCheckParams) {
  // Lưu IDs của task đã gửi reminder trong session
  const sentReminderIdsRef = useRef<Set<string>>(new Set());

  // Tham chiếu để tránh stale closure
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Hàm kiểm tra xem reminder time có đã tới chưa
  const isReminderTime = useCallback((task: Task): boolean => {
    if (!task.reminder || task.completed) {
      return false;
    }

    try {
      const reminderTime = new Date(task.reminder).getTime();
      const now = new Date().getTime();

      // Gửi reminder nếu thời gian hiện tại >= thời gian reminder
      // Cho phép 1 phút sai lệch
      return now >= reminderTime && now - reminderTime < 60 * 1000;
    } catch {
      return false;
    }
  }, []);

  // Hàm kiểm tra toàn bộ task
  const checkReminders = useCallback(() => {
    if (!webhookEnabled) return;

    tasksRef.current.forEach((task) => {
      const hasNotBeenSent = !sentReminderIdsRef.current.has(task.id);
      const isTimeToRemind = isReminderTime(task);

      if (isTimeToRemind && hasNotBeenSent) {
        onTaskReminded(task);
        sentReminderIdsRef.current.add(task.id);
      }
    });
  }, [isReminderTime, webhookEnabled, onTaskReminded]);

  // Chạy kiểm tra reminder mỗi 30 giây
  useEffect(() => {
    if (!webhookEnabled) return;

    // Kiểm tra ngay khi component mount
    checkReminders();

    // Thiết lập interval để kiểm tra periodic
    const interval = setInterval(checkReminders, 30 * 1000);

    return () => clearInterval(interval);
  }, [webhookEnabled, checkReminders]);

  // Reset danh sách sent reminders khi task thay đổi (xóa/sửa)
  useEffect(() => {
    const currentTaskIds = new Set(tasksRef.current.map((t) => t.id));
    const sentIds = Array.from(sentReminderIdsRef.current);

    // Xóa các task không còn tồn tại
    sentIds.forEach((id) => {
      if (!currentTaskIds.has(id)) {
        sentReminderIdsRef.current.delete(id);
      }
    });
  }, [tasks]);
}

export default useReminderCheck;
