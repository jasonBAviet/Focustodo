// ============================================================
// FOCUS TO-DO - tagDistributionHelpers
// ============================================================
import type { Task, Tag, PomodoroSession } from '../../types';

export interface TagSlice {
  id: string;
  name: string;
  color: string;
  minutes: number;
}

export function getTagTimeDistribution(
  tasks: Task[],
  tags: Tag[],
  pomodoroSessions: PomodoroSession[],
  filters: {
    selectedFolderId: string;
    selectedProjectId: string;
    selectedTagId: string;
  },
  projects: any[]
): TagSlice[] {
  const { selectedFolderId, selectedProjectId, selectedTagId } = filters;

  // Lọc danh sách task theo bộ lọc
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
  const taskById = new Map(filteredTasks.map((t) => [t.id, t]));
  const minutesByTag = new Map<string, number>(); // tagId -> minutes

  const focusSessions = pomodoroSessions
    .filter((s) => s.type === 'focus')
    .filter((s) => s.taskId && filteredTaskIds.has(s.taskId));

  if (focusSessions.length > 0) {
    focusSessions.forEach((s) => {
      const task = s.taskId ? taskById.get(s.taskId) : undefined;
      const tTags = task?.tags && task.tags.length > 0 ? task.tags : ['untagged'];
      
      // Chia đều thời gian cho các tag của task (hoặc có thể cộng dồn nguyên thời gian, ở đây cộng dồn nguyên thời gian)
      // Tùy quan điểm: Thường 1 task có 2 tag thì 30p focus sẽ tính 30p cho tag A và 30p cho tag B.
      // Để tránh tổng sai, ta chia đều.
      const mins = s.duration ?? 0;
      const minsPerTag = mins / tTags.length;

      tTags.forEach(tid => {
        minutesByTag.set(tid, (minutesByTag.get(tid) ?? 0) + minsPerTag);
      });
    });
  } else {
    // Fallback
    filteredTasks.forEach((t) => {
      const mins = t.totalFocusTime ?? 0;
      if (mins <= 0) return;
      const tTags = t.tags && t.tags.length > 0 ? t.tags : ['untagged'];
      const minsPerTag = mins / tTags.length;
      tTags.forEach(tid => {
        minutesByTag.set(tid, (minutesByTag.get(tid) ?? 0) + minsPerTag);
      });
    });
  }

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
