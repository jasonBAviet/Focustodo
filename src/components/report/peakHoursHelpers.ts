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
  },
  projects: any[]
): number[] {
  const { selectedFolderId, selectedProjectId, selectedTagId } = filters;

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
    if (session.taskId && !filteredTaskIds.has(session.taskId)) return;

    try {
      const startDate = new Date(session.startTime);
      if (isNaN(startDate.getTime())) return;
      
      const startHour = startDate.getHours();
      hours[startHour] += (session.duration ?? 25);
    } catch (e) {
      // ignore invalid dates
    }
  });

  return hours;
}
