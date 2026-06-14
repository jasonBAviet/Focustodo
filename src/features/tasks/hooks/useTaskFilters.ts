import { useCallback } from 'react';
import type { Task } from '@/types';
import { dateUtils } from '@/utils/dateUtils';
import { getDescendantFolderIds } from '@/utils/folderUtils';
import type { TaskFilters } from '@/features/tasks/TaskContext';

export interface UseTaskFiltersParams {
  tasks: Task[];
  activeView: string;
  activeProjectId: string | null;
  activeTagId: string | null;
  activeFolderId: string | null;
  searchQuery: string;
  filters: TaskFilters;
  folders: any[];
}

export function useTaskFilters({
  tasks,
  activeView,
  activeProjectId,
  activeTagId,
  activeFolderId,
  searchQuery,
  filters,
  folders,
}: UseTaskFiltersParams) {
  const hasValidDueDate = (task: Task) =>
    typeof task.dueDate === 'string' && task.dueDate.trim() !== '';

  const getFilteredTasks = useCallback((): Task[] => {
    let filtered: Task[] = [];
    const normalTasks = tasks;

    switch (activeView) {
      case 'today':
        filtered = normalTasks.filter((t) => !t.completed && dateUtils.isToday(t.dueDate));
        break;
      case 'tomorrow':
        filtered = normalTasks.filter((t) => !t.completed && dateUtils.isTomorrow(t.dueDate));
        break;
      case 'this-week':
        filtered = normalTasks.filter((t) => !t.completed && dateUtils.isThisWeek(t.dueDate));
        break;
      case 'planned':
        filtered = normalTasks.filter((t) => !t.completed && hasValidDueDate(t));
        break;
      case 'completed':
        filtered = normalTasks
          .filter((t) => t.completed)
          .sort((a, b) => {
            const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return tb - ta;
          })
          .slice(0, 100);
        break;
      case 'high-priority':
        filtered = normalTasks.filter((t) => !t.completed && t.priority === 'high');
        break;
      case 'medium-priority':
        filtered = normalTasks.filter((t) => !t.completed && t.priority === 'medium');
        break;
      case 'low-priority':
        filtered = normalTasks.filter((t) => !t.completed && t.priority === 'low');
        break;
      case 'someday':
        filtered = normalTasks.filter((t) => !t.completed && !hasValidDueDate(t));
        break;
      case 'project':
        if (activeProjectId) {
          filtered = normalTasks.filter((t) => !t.completed && t.projectId === activeProjectId);
        } else {
          filtered = normalTasks.filter((t) => !t.completed);
        }
        break;
      case 'unassigned':
        filtered = normalTasks.filter((t) => !t.completed && !t.projectId);
        break;
      case 'tag':
        if (activeTagId) {
          filtered = normalTasks.filter((t) => !t.completed && t.tags.includes(activeTagId));
        } else {
          filtered = normalTasks.filter((t) => !t.completed);
        }
        break;
      case 'folder':
        if (activeFolderId) {
          const descendantFolderIds = getDescendantFolderIds(folders, activeFolderId);
          const validFolderIds = [activeFolderId, ...descendantFolderIds];
          const projectIdsInFolder = folders
            .filter((f) => validFolderIds.includes(f.id))
            .flatMap((f) => f.projectIds || []);
          filtered = normalTasks.filter(
            (t) => !t.completed && t.projectId && projectIdsInFolder.includes(t.projectId)
          );
        } else {
          filtered = normalTasks.filter((t) => !t.completed);
        }
        break;
      case 'knowledge':
        filtered = [];
        break;
      case 'events':
        filtered = [];
        break;
      case 'all':
      default:
        filtered = normalTasks.filter((t) => !t.completed);
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q));
    }

    if (filters.text) {
      const txt = filters.text.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(txt) || t.note?.toLowerCase().includes(txt));
    }
    if (filters.tagIds.length > 0) {
      const realTagIds = filters.tagIds.filter((id) => id !== '__no_tag__');
      const wantNoTag = filters.tagIds.includes('__no_tag__');
      filtered = filtered.filter((t) =>
        (wantNoTag && t.tags.length === 0) ||
        realTagIds.some((tagId) => t.tags.includes(tagId))
      );
    }
    if (filters.projectIds.length > 0) {
      const realProjectIds = filters.projectIds.filter((id) => id !== '__no_project__');
      const wantNoProject = filters.projectIds.includes('__no_project__');
      filtered = filtered.filter((t) =>
        (wantNoProject && !t.projectId) ||
        (t.projectId && realProjectIds.includes(t.projectId))
      );
    }
    if (filters.createdFrom) {
      const from = new Date(filters.createdFrom).getTime();
      filtered = filtered.filter((t) => new Date(t.createdAt).getTime() >= from);
    }
    if (filters.createdTo) {
      const to = new Date(filters.createdTo).getTime() + 86400000;
      filtered = filtered.filter((t) => new Date(t.createdAt).getTime() <= to);
    }
    if (filters.dueFrom) {
      const from = new Date(filters.dueFrom).getTime();
      filtered = filtered.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= from);
    }
    if (filters.dueTo) {
      const to = new Date(filters.dueTo).getTime() + 86400000;
      filtered = filtered.filter((t) => t.dueDate && new Date(t.dueDate).getTime() <= to);
    }

    return filtered;
  }, [tasks, activeView, activeProjectId, activeTagId, activeFolderId, folders, searchQuery, filters]);

  return { getFilteredTasks };
}
