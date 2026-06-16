import { useCallback } from 'react';
import type { Task, Project, Folder, Tag, Subtask, PomodoroSession, PomodoroRecord, Attachment, Priority } from '@/types';
import { uuid } from '@/utils/uuid';
import { dateUtils } from '@/utils/dateUtils';
import { createProjectRemote, updateProjectRemote, deleteProjectRemote, createFolderRemote, updateFolderRemote, deleteFolderRemote, createTagRemote, updateTagRemote, deleteTagRemote, completeTaskRemote } from '@/utils/remoteState';

export interface UseTaskActionsParams {
  tasks: Task[]; setTasks: any;
  projects: Project[]; setProjects: any;
  folders: Folder[]; setFolders: any;
  tags: Tag[]; setTags: any;
  attachments: Attachment[]; setAttachments: any;
  pomodoroSessions: PomodoroSession[]; setPomodoroSessions: any;
  pomodoroRecords: PomodoroRecord[]; setPomodoroRecords: any;
  selectedTaskId: string | null; setSelectedTaskId: any;
  activeView: string; setActiveView: any;
  activeProjectId: string | null; setActiveProjectId: any;
  activeFolderId: string | null; setActiveFolderId: any;
  activeTagId: string | null; setActiveTagId: any;
  deletedIdsRef: any;
  onTaskCreated: any; onTaskCompleted: any; onPomodoroCompleted: any;
}

export function useTaskActions({
  tasks, setTasks, projects, setProjects, folders: _folders, setFolders, tags: _tags, setTags, attachments: _attachments, setAttachments,
  pomodoroSessions: _pomodoroSessions, setPomodoroSessions, pomodoroRecords: _pomodoroRecords, setPomodoroRecords,
  selectedTaskId: _selectedTaskId, setSelectedTaskId, activeView, setActiveView,
  activeProjectId, setActiveProjectId, activeFolderId, setActiveFolderId,
  activeTagId, setActiveTagId, deletedIdsRef, onTaskCreated, onTaskCompleted, onPomodoroCompleted
}: UseTaskActionsParams) {

  const addTask = useCallback((title: string, projectId: string | null = null, priority: Priority = 'none', pomodoroEstimate: number = 1): Task => {
    const now = dateUtils.now();
    const newTask: Task = {
      id: uuid(), title, projectId, priority, dueDate: null, startDate: null, reminder: null, repeat: 'none', repeatCustom: null, note: '',
      subtasks: [], pomodoroEstimate, pomodoroCompleted: 0, totalFocusTime: 0, completed: false, flagged: false,
      tags: [], createdAt: now, completedAt: null, updatedAt: now,
    };
    setTasks((prev: any) => {
      const pos = prev.filter((t: any) => (t.projectId ?? null) === (projectId ?? null)).reduce((m: any, t: any) => Math.max(m, t.position ?? 0), -1) + 1;
      return [...prev, { ...newTask, position: pos }];
    });
    onTaskCreated(newTask);
    return newTask;
  }, [setTasks, onTaskCreated]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev: any) => prev.map((t: any) => t.id === id ? { ...t, ...updates, updatedAt: dateUtils.now() } : t));
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    deletedIdsRef.current.tasks.push(id);
    setAttachments((prev: any) => {
      const targets = prev.filter((a: any) => a.taskId === id);
      targets.forEach((a: any) => deletedIdsRef.current.attachments.push(a.id));
      return prev.filter((a: any) => a.taskId !== id);
    });
    setTasks((prev: any) => prev.filter((t: any) => t.id !== id));
    setSelectedTaskId((prev: any) => (prev === id ? null : prev));
  }, [setTasks, setAttachments, setSelectedTaskId, deletedIdsRef]);

  const reorderTasks = useCallback((orderedIds: string[]) => {
    const now = dateUtils.now();
    const posMap = new Map(orderedIds.map((id, i) => [id, i]));
    setTasks((prev: any) => prev.map((t: any) => (posMap.has(t.id) ? { ...t, position: posMap.get(t.id)!, updatedAt: now } : t)));
  }, [setTasks]);

  const completeTask = useCallback((id: string): Task | null => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return null;
    const now = dateUtils.now();
    const completed: Task = { ...target, completed: true, completedAt: now, updatedAt: now };
    setTasks((prev: any) => prev.map((t: any) => (t.id === id ? completed : t)));
    onTaskCompleted(completed);
    if (target.repeat && target.repeat !== 'none') {
      completeTaskRemote(id).then((spawned) => {
        if (spawned) setTasks((prev: any) => (prev.some((t: any) => t.id === spawned.id) ? prev : [...prev, spawned]));
      }).catch(() => {});
    }
    return completed;
  }, [tasks, setTasks, onTaskCompleted]);

  const restoreTask = useCallback((id: string) => {
    setTasks((prev: any) => prev.map((t: any) => t.id === id ? { ...t, completed: false, completedAt: null, updatedAt: dateUtils.now() } : t));
  }, [setTasks]);

  const addPomodoroSession = useCallback((session: PomodoroSession) => {
    setPomodoroSessions((prev: any) => [session, ...prev].slice(0, 2000));
    if (session.type === 'focus' && session.completed) onPomodoroCompleted(session);
  }, [setPomodoroSessions, onPomodoroCompleted]);

  const addPomodoroRecord = useCallback((record: PomodoroRecord) => {
    setPomodoroRecords((prev: any) => [record, ...prev].slice(0, 2000));
  }, [setPomodoroRecords]);

  const updatePomodoroRecord = useCallback((id: string, updates: Partial<PomodoroRecord>) => {
    setPomodoroRecords((prev: any) => prev.map((r: any) => r.id === id ? { ...r, ...updates, updatedAt: dateUtils.now() } : r));
  }, [setPomodoroRecords]);

  const addAttachment = useCallback((attachment: Attachment) => {
    setAttachments((prev: any) => [...prev, attachment]);
  }, [setAttachments]);

  const deleteAttachment = useCallback((id: string) => {
    deletedIdsRef.current.attachments.push(id);
    setAttachments((prev: any) => prev.filter((a: any) => a.id !== id));
  }, [setAttachments, deletedIdsRef]);

  const addSubtask = useCallback((taskId: string, title: string) => {
    const subtask: Subtask = { id: uuid(), title, completed: false, createdAt: dateUtils.now() };
    setTasks((prev: any) => prev.map((t: any) => t.id === taskId ? { ...t, subtasks: [...t.subtasks, subtask], updatedAt: dateUtils.now() } : t));
  }, [setTasks]);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    const now = dateUtils.now();
    setTasks((prev: any) => prev.map((t: any) => t.id === taskId ? {
      ...t, subtasks: t.subtasks.map((s: any) => s.id === subtaskId ? { ...s, completed: !s.completed, completedAt: !s.completed ? now : null } : s),
      updatedAt: now,
    } : t));
  }, [setTasks]);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev: any) => prev.map((t: any) => t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s: any) => s.id !== subtaskId), updatedAt: dateUtils.now() } : t));
  }, [setTasks]);

  const addProject = useCallback((name: string, color: string, folderId: string | null = null): Project => {
    const now = dateUtils.now();
    const newProject: Project = { id: uuid(), name, color, isVisible: true, taskCount: 0, folderId, createdAt: now, updatedAt: now };
    setProjects((prev: any) => {
      const pos = prev.filter((p: any) => (p.folderId ?? null) === (folderId ?? null)).reduce((m: any, p: any) => Math.max(m, p.position ?? 0), -1) + 1;
      return [...prev, { ...newProject, position: pos }];
    });
    if (folderId) setFolders((prev: any) => prev.map((f: any) => f.id === folderId ? { ...f, projectIds: [...f.projectIds, newProject.id], updatedAt: now } : f));
    createProjectRemote(newProject).catch(() => {});
    return newProject;
  }, [setProjects, setFolders]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects((prev: any) => prev.map((p: any) => (p.id === id ? { ...p, ...updates, updatedAt: dateUtils.now() } : p)));
    if (updates.isVisible === false && activeProjectId === id && activeView === 'project') {
      setActiveView('today'); setActiveProjectId(null);
    }
    updateProjectRemote(id, updates).catch(() => {});
  }, [setProjects, activeProjectId, activeView, setActiveView, setActiveProjectId]);

  const deleteProject = useCallback((id: string) => {
    deletedIdsRef.current.projects.push(id);
    setProjects((prev: any) => prev.filter((p: any) => p.id !== id));
    setFolders((prev: any) => prev.map((f: any) => f.projectIds.includes(id) ? { ...f, projectIds: f.projectIds.filter((pid: any) => pid !== id), updatedAt: dateUtils.now() } : f));
    setTasks((prev: any) => prev.map((t: any) => t.projectId === id ? { ...t, projectId: null, updatedAt: dateUtils.now() } : t));
    if (activeProjectId === id && activeView === 'project') {
      setActiveView('today'); setActiveProjectId(null);
    }
    deleteProjectRemote(id).catch(() => {});
  }, [setProjects, setFolders, setTasks, activeProjectId, activeView, setActiveView, setActiveProjectId, deletedIdsRef]);

  const addFolder = useCallback((name: string, color: string, parentId: string | null = null): Folder => {
    const now = dateUtils.now();
    const newFolder: Folder = { id: uuid(), name, color, projectIds: [], parentId, isVisible: true, createdAt: now, updatedAt: now };
    setFolders((prev: any) => {
      const pos = prev.filter((f: any) => (f.parentId ?? null) === (parentId ?? null)).reduce((m: any, f: any) => Math.max(m, f.position ?? 0), -1) + 1;
      return [...prev, { ...newFolder, position: pos }];
    });
    createFolderRemote(newFolder).catch(() => {});
    return newFolder;
  }, [setFolders]);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders((prev: any) => prev.map((f: any) => (f.id === id ? { ...f, ...updates, updatedAt: dateUtils.now() } : f)));
    if (updates.isVisible === false && activeFolderId === id && activeView === 'folder') {
      setActiveView('today'); setActiveFolderId(null);
    }
    updateFolderRemote(id, updates).catch(() => {});
  }, [setFolders, activeFolderId, activeView, setActiveView, setActiveFolderId]);

  const deleteFolder = useCallback((id: string) => {
    deletedIdsRef.current.folders.push(id);
    const now = dateUtils.now();
    setFolders((prev: any) => prev.filter((f: any) => f.id !== id).map((f: any) => (f.parentId === id ? { ...f, parentId: null, updatedAt: now } : f)));
    setProjects((prev: any) => prev.map((p: any) => p.folderId === id ? { ...p, folderId: null, updatedAt: now } : p));
    if (activeFolderId === id && activeView === 'folder') {
      setActiveView('today'); setActiveFolderId(null);
    }
    deleteFolderRemote(id).catch(() => {});
  }, [setFolders, setProjects, activeFolderId, activeView, setActiveView, setActiveFolderId, deletedIdsRef]);

  const addTag = useCallback((name: string, color: string, scope?: { projectId?: string | null; folderId?: string | null }): Tag => {
    const now = dateUtils.now();
    const newTag: Tag = { id: uuid(), name, color, projectId: scope?.projectId ?? null, folderId: scope?.folderId ?? null, isVisible: true, createdAt: now, updatedAt: now };
    setTags((prev: any) => [...prev, newTag]);
    createTagRemote(newTag).catch(() => {});
    return newTag;
  }, [setTags]);

  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    setTags((prev: any) => prev.map((t: any) => (t.id === id ? { ...t, ...updates, updatedAt: dateUtils.now() } : t)));
    if (updates.isVisible === false && activeTagId === id && activeView === 'tag') {
      setActiveView('today'); setActiveTagId(null);
    }
    updateTagRemote(id, updates).catch(() => {});
  }, [setTags, activeTagId, activeView, setActiveView, setActiveTagId]);

  const deleteTag = useCallback((id: string) => {
    deletedIdsRef.current.tags.push(id);
    setTags((prev: any) => prev.filter((t: any) => t.id !== id));
    setTasks((prev: any) => prev.map((task: any) => task.tags.includes(id) ? { ...task, tags: task.tags.filter((tid: any) => tid !== id), updatedAt: dateUtils.now() } : task));
    if (activeTagId === id && activeView === 'tag') {
      setActiveView('today'); setActiveTagId(null);
    }
    deleteTagRemote(id).catch(() => {});
  }, [setTags, setTasks, activeTagId, activeView, setActiveView, setActiveTagId, deletedIdsRef]);

  const getProjectName = useCallback((projectId: string | null): string => {
    if (!projectId) return 'Inbox';
    return projects.find((p) => p.id === projectId)?.name ?? 'Inbox';
  }, [projects]);

  return {
    addTask, updateTask, deleteTask, completeTask, restoreTask, reorderTasks,
    addProject, updateProject, deleteProject, addFolder, updateFolder, deleteFolder,
    addTag, updateTag, deleteTag, addSubtask, toggleSubtask, deleteSubtask,
    addPomodoroSession, addPomodoroRecord, updatePomodoroRecord,
    addAttachment, deleteAttachment, getProjectName
  };
}
