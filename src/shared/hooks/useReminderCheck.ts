// ============================================================
// FOCUS TO-DO - useReminderCheck
// Hook to check tasks needing reminder and send webhook
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import type { Task } from '@/types';

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
  // Store IDs of tasks already sent reminder in session
  const sentReminderIdsRef = useRef<Set<string>>(new Set());

  // Reference to avoid stale closure
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Function to check if reminder time has arrived
  const isReminderTime = useCallback((task: Task): boolean => {
    if (!task.reminder || task.completed) {
      return false;
    }

    try {
      const reminderTime = new Date(task.reminder).getTime();
      const now = new Date().getTime();

      // Send reminder if current time >= reminder time
      // Allow 1 minute margin
      return now >= reminderTime && now - reminderTime < 60 * 1000;
    } catch {
      return false;
    }
  }, []);

  // Function to check all tasks
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

  // Run reminder check every 30 seconds
  useEffect(() => {
    if (!webhookEnabled) return;

    // Check immediately on component mount
    checkReminders();

    // Set interval for periodic check
    const interval = setInterval(checkReminders, 30 * 1000);

    return () => clearInterval(interval);
  }, [webhookEnabled, checkReminders]);

  // Reset sent reminders list when task changes (delete/edit)
  useEffect(() => {
    const currentTaskIds = new Set(tasksRef.current.map((t) => t.id));
    const sentIds = Array.from(sentReminderIdsRef.current);

    // Delete non-existent tasks
    sentIds.forEach((id) => {
      if (!currentTaskIds.has(id)) {
        sentReminderIdsRef.current.delete(id);
      }
    });
  }, [tasks]);
}

export default useReminderCheck;
