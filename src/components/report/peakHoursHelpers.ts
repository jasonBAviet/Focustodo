// ============================================================
// FOCUS TO-DO - peakHoursHelpers
// ============================================================
import type { Task, PomodoroSession } from '../../types';

export function getPeakHoursData(
  tasks: Task[],
  pomodoroSessions: PomodoroSession[],
  filters: {
    selectedFolderId: string;
    selectedProjectId: string;
    selectedTagId: string;
    startDate?: Date;
    endDate?: Date;
  },
  projects: any[]
): number[] {
  const { selectedFolderId, selectedProjectId, selectedTagId, startDate, endDate } = filters;

  const filteredTasks = tasks.filter((task) => {
    if (selectedFolderId !== 'all') {
      if (!task.projectId) return false;
      const project = projects.find((p) => p.id === task.projectId);
      if (!project || project.folderId !== selectedFolderId) return false;
    }
    if (selectedProjectId !== 'all') {
      if (task.projectId !== selectedProjectId) return false;
    }
    if (selectedTagId !== 'all') {
      if (!task.tags || !task.tags.includes(selectedTagId)) return false;
    }
    return true;
  });

  const filteredTaskIds = new Set(filteredTasks.map((t) => t.id));
  
  // Mảng 24 giờ (từ 0h đến 23h)
  const hours = new Array(24).fill(0);

  pomodoroSessions.forEach(session => {
    if (session.type !== 'focus') return;
    // Loại session không gắn task / không khớp bộ lọc (nhất quán với các thẻ khác)
    if (!session.taskId || !filteredTaskIds.has(session.taskId)) return;

    try {
      const sDate = new Date(session.startTime);
      if (isNaN(sDate.getTime())) return;

      // Lọc theo khoảng thời gian nếu có
      if (startDate && endDate) {
        if (sDate < startDate || sDate > endDate) return;
      }

      const startHour = sDate.getHours();
      hours[startHour] += (session.duration ?? 0);
    } catch (e) {
      // ignore invalid dates
    }
  });

  return hours;
}
