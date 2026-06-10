// ============================================================
// FOCUS TO-DO - tagDistributionHelpers
// ============================================================
import type { Task, Tag } from '../../types';

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

  // Nguồn sự thật: gom task.totalFocusTime (thời gian thực) theo nhãn.
  // 1 task có nhiều nhãn -> chia đều thời gian để tổng không bị nhân lên.
  const minutesByTag = new Map<string, number>(); // tagId -> minutes
  filteredTasks.forEach((t) => {
    const mins = t.totalFocusTime ?? 0;
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
