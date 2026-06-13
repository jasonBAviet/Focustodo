// ============================================================
// FOCUS TO-DO - tagDistributionHelpers
// ============================================================
import type { Task, Tag, PomodoroSession } from '@/types';

export interface TagSlice {
  id: string;
  name: string;
  color: string;
  minutes: number;
}

export function getTagTimeDistribution(
  tasks: Task[],
  tags: Tag[],
  filters: {
    selectedFolderId: string;
    selectedProjectId: string;
    selectedTagId: string;
    startDate?: Date;
    endDate?: Date;
  },
  projects: any[],
  pomodoroSessions: PomodoroSession[]
): TagSlice[] {
  const { selectedFolderId, selectedProjectId, selectedTagId, startDate, endDate } = filters;

  // 1. Tính số phút tập trung cho mỗi task trong khoảng thời gian [startDate, endDate]
  const minutesByTask = new Map<string, number>();

  if (startDate && endDate) {
    const sessionsInPeriod = pomodoroSessions.filter(s => {
      if (!s.startTime || s.type !== 'focus') return false;
      const sDate = new Date(s.startTime);
      return sDate >= startDate && sDate <= endDate;
    });

    sessionsInPeriod.forEach(s => {
      if (s.taskId) {
        minutesByTask.set(s.taskId, (minutesByTask.get(s.taskId) ?? 0) + (s.duration ?? 0));
      }
    });
  } else {
    // Fallback: dùng task.totalFocusTime nếu không lọc thời gian
    tasks.forEach(t => {
      if (t.totalFocusTime && t.totalFocusTime > 0) {
        minutesByTask.set(t.id, t.totalFocusTime);
      }
    });
  }

  // 2. Lọc danh sách task theo các bộ lọc khác
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

  // 3. Gom nhóm phút theo nhãn (chia đều nếu task có nhiều nhãn)
  const minutesByTag = new Map<string, number>(); // tagId -> minutes
  filteredTasks.forEach((t) => {
    const mins = minutesByTask.get(t.id) ?? 0;
    if (mins <= 0) return;
    const tTags = t.tags && t.tags.length > 0 ? t.tags : ['untagged'];
    const minsPerTag = mins / tTags.length;
    tTags.forEach(tid => {
      minutesByTag.set(tid, (minutesByTag.get(tid) ?? 0) + minsPerTag);
    });
  });

  const tagById = new Map(tags.map((t) => [t.id, t]));

  return Array.from(minutesByTag.entries())
    .map(([tid, minutes]) => {
      const tag = tagById.get(tid);
      return {
        id: tid,
        name: tag?.name ?? 'Không nhãn',
        color: tag?.color ?? '#8d99ae',
        minutes: Math.round(minutes),
      };
    })
    .filter((s) => s.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}
