import type { Task, Project, Folder, ViewType, Settings } from '../types';
import { dateUtils } from './dateUtils';
import { getDescendantFolderIds } from './folderUtils';

export const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m === 0) return `${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const getTasksStats = (taskList: Task[], settings: Settings) => {
  const count = taskList.length;
  const totalPomodoros = taskList.reduce((acc, t) => {
    return acc + Math.max(0, (t.pomodoroEstimate || 0) - (t.pomodoroCompleted || 0));
  }, 0);
  const time = totalPomodoros * (settings?.pomodoroLength || 25);
  return { count, time };
};

export const getProjectStats = (normalTasks: Task[], projectId: string, settings: Settings) =>
  getTasksStats(normalTasks.filter((t) => t.projectId === projectId && !t.completed), settings);

export const getFolderStats = (
  normalTasks: Task[],
  projects: Project[],
  folders: Folder[],
  folderId: string,
  settings: Settings
) => {
  const subtree = new Set(getDescendantFolderIds(folders, folderId));
  const folderProjectIds = projects.filter(p => p.folderId && subtree.has(p.folderId)).map(p => p.id);
  return getTasksStats(normalTasks.filter(t => !t.completed && t.projectId && folderProjectIds.includes(t.projectId)), settings);
};

export const getTagStats = (
  normalTasks: Task[],
  projects: Project[],
  folders: Folder[],
  activeView: ViewType,
  activeProjectId: string | null,
  activeFolderId: string | null,
  tagId: string,
  settings: Settings
) => {
  let pool = normalTasks;
  if (activeView === 'project' && activeProjectId) {
    pool = normalTasks.filter((t) => t.projectId === activeProjectId);
  } else if (activeView === 'folder' && activeFolderId) {
    const subtree = new Set(getDescendantFolderIds(folders, activeFolderId));
    const folderPids = new Set(projects.filter((p) => p.folderId && subtree.has(p.folderId)).map((p) => p.id));
    pool = normalTasks.filter((t) => t.projectId !== null && folderPids.has(t.projectId));
  }
  return getTasksStats(pool.filter((t) => !t.completed && (t.tags ?? []).includes(tagId)), settings);
};

const hasValidDueDate = (task: Task) =>
  typeof task.dueDate === 'string' && task.dueDate.trim() !== '';

export const getViewStats = (
  tasks: Task[],
  normalTasks: Task[],
  viewId: ViewType,
  settings: Settings
) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  switch (viewId) {
    case 'today':
      return getTasksStats(normalTasks.filter((t) => !t.completed && t.dueDate?.startsWith(todayStr)), settings);
    case 'tomorrow':
      return getTasksStats(normalTasks.filter((t) => !t.completed && t.dueDate?.startsWith(tomorrowStr)), settings);
    case 'this-week':
      return getTasksStats(normalTasks.filter((t) => !t.completed && dateUtils.isThisWeek(t.dueDate)), settings);
    case 'planned':
      return getTasksStats(normalTasks.filter((t) => !t.completed && hasValidDueDate(t)), settings);
    case 'completed':
      return getTasksStats(normalTasks.filter((t) => t.completed), settings);
    case 'events':
      return getTasksStats(normalTasks.filter((t) => !t.completed && hasValidDueDate(t)), settings);
    case 'knowledge':
      return { count: tasks.filter((t) => !!t.isKnowledge).length, time: 0 };
    case 'unassigned':
      return getTasksStats(
        normalTasks.filter((t) => !t.completed && !t.projectId && (t.tags ?? []).length === 0),
        settings
      );
    default:
      return { count: 0, time: 0 };
  }
};
