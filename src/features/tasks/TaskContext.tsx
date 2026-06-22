import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Task, Knowledge, Diary, Project, Folder, Tag, ViewType, Priority, PomodoroSession, Attachment, PomodoroRecord, TaskStatusType } from '@/types';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import type { DeletedIds } from '@/utils/remoteState';
import { useAppContext } from '@/core/contexts/AppContext';
import { useWebhookContext } from '@/core/contexts/WebhookContext';

import { useTaskSync } from './hooks/useTaskSync';
import { useTaskFilters } from './hooks/useTaskFilters';
import { useTaskActions } from './hooks/useTaskActions';
import { useAuth } from '@/features/auth/AuthContext';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

const DEFAULT_PROJECTS: Project[] = [
  { id: 'inbox',    name: 'Inbox',    color: '#7ec8e3', isVisible: true, taskCount: 0, createdAt: new Date().toISOString() },
  { id: 'work',     name: 'Work',     color: '#4361ee', isVisible: true, taskCount: 0, createdAt: new Date().toISOString() },
  { id: 'study',    name: 'Study',    color: '#06d6a0', isVisible: true, taskCount: 0, createdAt: new Date().toISOString() },
  { id: 'personal', name: 'Personal', color: '#f4a261', isVisible: true, taskCount: 0, createdAt: new Date().toISOString() },
];

export interface TaskFilters {
  text: string;
  tagIds: string[];
  projectIds: string[];
  statuses: TaskStatusType[];
  createdFrom: string | null;
  createdTo: string | null;
  startFrom: string | null;
  startTo: string | null;
  dueFrom: string | null;
  dueTo: string | null;
}

export const EMPTY_FILTERS: TaskFilters = {
  text: '', tagIds: [], projectIds: [], statuses: [], createdFrom: null, createdTo: null, startFrom: null, startTo: null, dueFrom: null, dueTo: null,
};

export interface NewTaskDraft {
  title: string;
  projectId: string | null;
  tags: string[];
  priority: Priority;
  pomodoro: number;
  dueDate: string | null;
  note: string;
}

const DEFAULT_NEW_TASK_DRAFT: NewTaskDraft = {
  title: '', projectId: null, tags: [], priority: 'none', pomodoro: 1, dueDate: null, note: '',
};

interface TaskContextType {
  tasks: Task[]; projects: Project[]; folders: Folder[]; tags: Tag[];
  pomodoroSessions: PomodoroSession[]; pomodoroRecords: PomodoroRecord[]; attachments: Attachment[];
  selectedTaskId: string | null; activeView: ViewType; activeProjectId: string | null;
  activeTagId: string | null; activeFolderId: string | null; searchQuery: string; filters: TaskFilters;
  newTaskPanelOpen: boolean; setNewTaskPanelOpen: (v: boolean) => void;
  newTaskDraft: NewTaskDraft;
  updateNewTaskDraft: (fields: Partial<NewTaskDraft>) => void;
  resetNewTaskDraft: () => void;
  submitNewTask: () => void;
  setFilters: React.Dispatch<React.SetStateAction<TaskFilters>>;
  setSelectedTaskId: (id: string | null) => void;
  setActiveView: (view: ViewType) => void;
  setActiveProjectId: (id: string | null) => void;
  setActiveTagId: (id: string | null) => void;
  setActiveFolderId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  addTask: (title: string, projectId?: string | null, priority?: Priority, pomodoroEstimate?: number, isKnowledge?: boolean) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => Task | null;
  restoreTask: (id: string) => void;
  reorderTasks: (orderedIds: string[]) => void;
  addProject: (name: string, color: string, folderId?: string | null) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addFolder: (name: string, color: string, parentId?: string | null) => Folder;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  addTag: (name: string, color: string, scope?: { projectId?: string | null; folderId?: string | null }) => Tag;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addPomodoroSession: (session: PomodoroSession) => void;
  addPomodoroRecord: (record: PomodoroRecord) => void;
  updatePomodoroRecord: (id: string, updates: Partial<PomodoroRecord>) => void;
  addAttachment: (attachment: Attachment) => void;
  deleteAttachment: (id: string) => void;
  getFilteredTasks: () => Task[];
  getProjectName: (projectId: string | null) => string;
  knowledges: Knowledge[];
  setKnowledges: React.Dispatch<React.SetStateAction<Knowledge[]>>;
  diaries: Diary[];
  setDiaries: React.Dispatch<React.SetStateAction<Diary[]>>;
  deletedIdsRef: React.MutableRefObject<DeletedIds>;
}

export const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useLocalStorage<Task[]>('focus-tasks', []);
  const [knowledges, setKnowledges] = useLocalStorage<Knowledge[]>('focus-knowledges', []);
  const [diaries, setDiaries] = useLocalStorage<Diary[]>('focus-diaries', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('focus-projects', DEFAULT_PROJECTS);
  const [folders, setFolders] = useLocalStorage<Folder[]>('focus-folders', []);
  const [tags, setTags] = useLocalStorage<Tag[]>('focus-tags', []);
  const [pomodoroSessions, setPomodoroSessions] = useLocalStorage<PomodoroSession[]>('focus-pomodoro-sessions', []);
  const [pomodoroRecords, setPomodoroRecords] = useLocalStorage<PomodoroRecord[]>('focus-pomodoro-records', []);
  const [attachments, setAttachments] = useLocalStorage<Attachment[]>('focus-attachments', []);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeView, setActiveView] = useLocalStorage<ViewType>('focus-active-view', 'today');
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('focus-active-project', null);
  const [activeTagId, setActiveTagId] = useLocalStorage<string | null>('focus-active-tag', null);
  const [activeFolderId, setActiveFolderId] = useLocalStorage<string | null>('focus-active-folder', null);
  const [searchQuery, setSearchQuery] = useLocalStorage<string>('focus-search', '');
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [newTaskPanelOpen, setNewTaskPanelOpen] = useState(false);
  const [newTaskDraft, setNewTaskDraftState] = useState<NewTaskDraft>(() => ({
    ...DEFAULT_NEW_TASK_DRAFT,
    projectId: activeView === 'project' ? activeProjectId : null,
    tags: (activeView === 'tag' && activeTagId) ? [activeTagId] : [],
  }));
  const updateNewTaskDraft = (fields: Partial<NewTaskDraft>) =>
    setNewTaskDraftState(prev => ({ ...prev, ...fields }));
  const resetNewTaskDraft = () =>
    setNewTaskDraftState({
      ...DEFAULT_NEW_TASK_DRAFT,
      projectId: activeView === 'project' ? activeProjectId : null,
      tags: (activeView === 'tag' && activeTagId) ? [activeTagId] : [],
    });

  // Khi user chuyển sang project/tag view hoặc đổi project/tag → cập nhật draft tương ứng
  useEffect(() => {
    if (activeView === 'project') {
      setNewTaskDraftState(prev => ({ ...prev, projectId: activeProjectId, tags: [] }));
    } else if (activeView === 'tag') {
      setNewTaskDraftState(prev => ({ ...prev, projectId: null, tags: activeTagId ? [activeTagId] : [] }));
    } else {
      setNewTaskDraftState(prev => ({ ...prev, projectId: null, tags: [] }));
    }
  }, [activeView, activeProjectId, activeTagId]);

  const { settings, updateSettings } = useAppContext();
  const { onTaskCreated, onTaskCompleted, onPomodoroCompleted } = useWebhookContext();
  const { token } = useAuth();
  const isMobile = useIsMobile();

  const deletedIdsRef = useRef<DeletedIds>({ tasks: [], knowledges: [], diaries: [], projects: [], folders: [], tags: [], attachments: [], pomodoroRecords: [] });

  useTaskSync({
    token,
    tasks, setTasks, knowledges, setKnowledges, diaries, setDiaries, projects, setProjects, folders, setFolders, tags, setTags,
    pomodoroSessions, setPomodoroSessions, pomodoroRecords, setPomodoroRecords,
    attachments, setAttachments, selectedTaskId, setSelectedTaskId,
    activeView, activeProjectId, searchQuery, settings, updateSettings, deletedIdsRef,
    isMobile,
  });

  const { getFilteredTasks } = useTaskFilters({
    tasks, activeView, activeProjectId, activeTagId, activeFolderId, searchQuery, filters, folders
  });

  const actions = useTaskActions({
    tasks, setTasks, projects, setProjects, folders, setFolders, tags, setTags, attachments, setAttachments,
    pomodoroSessions, setPomodoroSessions, pomodoroRecords, setPomodoroRecords,
    selectedTaskId, setSelectedTaskId, activeView, setActiveView,
    activeProjectId, setActiveProjectId, activeFolderId, setActiveFolderId,
    activeTagId, setActiveTagId, deletedIdsRef, onTaskCreated, onTaskCompleted, onPomodoroCompleted
  });

  const submitNewTask = () => {
    if (!newTaskDraft.title.trim()) return;
    const created = actions.addTask(newTaskDraft.title.trim(), newTaskDraft.projectId, newTaskDraft.priority, newTaskDraft.pomodoro);
    const extras: Partial<Task> = {};
    if (newTaskDraft.tags.length) extras.tags = newTaskDraft.tags;
    if (newTaskDraft.dueDate) extras.dueDate = newTaskDraft.dueDate;
    if (newTaskDraft.note.trim()) extras.note = newTaskDraft.note.trim();
    if (Object.keys(extras).length) actions.updateTask(created.id, extras);
    setSelectedTaskId(created.id);
    setNewTaskPanelOpen(false);
    setNewTaskDraftState({
      ...DEFAULT_NEW_TASK_DRAFT,
      projectId: activeView === 'project' ? activeProjectId : null,
      tags: (activeView === 'tag' && activeTagId) ? [activeTagId] : [],
    });
  };

  return (
    <TaskContext.Provider value={{
      tasks, projects, folders, tags, pomodoroSessions, pomodoroRecords, attachments,
      selectedTaskId, activeView, activeProjectId, activeTagId, activeFolderId, searchQuery, filters,
      newTaskPanelOpen, setNewTaskPanelOpen,
      newTaskDraft, updateNewTaskDraft, resetNewTaskDraft, submitNewTask,
      setFilters, setSelectedTaskId, setActiveView, setActiveProjectId, setActiveTagId, setActiveFolderId, setSearchQuery,
      getFilteredTasks, knowledges, setKnowledges, diaries, setDiaries, deletedIdsRef, ...actions
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTaskContext must be used within a TaskProvider');
  return context;
}
