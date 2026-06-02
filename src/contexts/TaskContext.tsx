// ============================================================
// FOCUS TO-DO - TaskContext
// Quản lý toàn bộ trạng thái Task và Project trong ứng dụng.
// Đây cũng là lớp đồng bộ với DB (nguồn dữ liệu chính):
// load/save tasks, projects, folders, tags, settings,
// pomodoro sessions và ui_state qua /api/state.
// ============================================================
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  Task,
  Project,
  Folder,
  Tag,
  ViewType,
  Priority,
  Subtask,
  PomodoroSession,
} from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { dateUtils } from '../utils/dateUtils';
import { loadRemoteAppState, saveRemoteAppState } from '../utils/remoteState';
import type { RemoteAppState } from '../utils/remoteState';
import { useAppContext } from './AppContext';
import { useWebhookContext } from './WebhookContext';

// ----------------------------------------------------------
// Danh sách project mặc định khi localStorage còn trống
// ----------------------------------------------------------
const DEFAULT_PROJECTS: Project[] = [
  { id: 'inbox',    name: 'Inbox',    color: '#7ec8e3', isVisible: true, taskCount: 0, createdAt: new Date().toISOString() },
  { id: 'work',     name: 'Work',     color: '#4361ee', isVisible: true, taskCount: 0, createdAt: new Date().toISOString() },
  { id: 'study',    name: 'Study',    color: '#06d6a0', isVisible: true, taskCount: 0, createdAt: new Date().toISOString() },
  { id: 'personal', name: 'Personal', color: '#f4a261', isVisible: true, taskCount: 0, createdAt: new Date().toISOString() },
];

// ----------------------------------------------------------
// Kiểu dữ liệu Context
// ----------------------------------------------------------
interface TaskContextType {
  tasks: Task[];
  projects: Project[];
  folders: Folder[];
  tags: Tag[];
  pomodoroSessions: PomodoroSession[];
  selectedTaskId: string | null;
  activeView: ViewType;
  activeProjectId: string | null;
  activeTagId: string | null;
  activeFolderId: string | null;
  searchQuery: string;
  setSelectedTaskId: (id: string | null) => void;
  setActiveView: (view: ViewType) => void;
  setActiveProjectId: (id: string | null) => void;
  setActiveTagId: (id: string | null) => void;
  setActiveFolderId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  addTask: (title: string, projectId?: string | null, priority?: Priority, pomodoroEstimate?: number) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => Task | null;
  restoreTask: (id: string) => void;
  addProject: (name: string, color: string, folderId?: string | null) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addFolder: (name: string, color: string) => Folder;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  addTag: (name: string, color: string) => Tag;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addPomodoroSession: (session: PomodoroSession) => void;
  getFilteredTasks: () => Task[];
  getProjectName: (projectId: string | null) => string;
}

// ----------------------------------------------------------
// Khởi tạo Context
// ----------------------------------------------------------
export const TaskContext = createContext<TaskContextType | null>(null);

// ----------------------------------------------------------
// Provider
// ----------------------------------------------------------
export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useLocalStorage<Task[]>('focus-tasks', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('focus-projects', DEFAULT_PROJECTS);
  const [folders, setFolders] = useLocalStorage<Folder[]>('focus-folders', []);
  const [tags, setTags] = useLocalStorage<Tag[]>('focus-tags', []);
  const [pomodoroSessions, setPomodoroSessions] = useLocalStorage<PomodoroSession[]>('focus-pomodoro-sessions', []);
  const [selectedTaskId, setSelectedTaskId] = useLocalStorage<string | null>('focus-selected-task', null);
  const [activeView, setActiveView] = useLocalStorage<ViewType>('focus-active-view', 'today');
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('focus-active-project', null);
  const [activeTagId, setActiveTagId] = useLocalStorage<string | null>('focus-active-tag', null);
  const [activeFolderId, setActiveFolderId] = useLocalStorage<string | null>('focus-active-folder', null);
  const [searchQuery, setSearchQuery] = useLocalStorage<string>('focus-search', '');

  // Settings sống trong AppContext nhưng cũng đồng bộ với DB qua lớp này
  const { settings, updateSettings } = useAppContext();
  // Webhook (event log dùng chung) để bắn các sự kiện task/pomodoro
  const { onTaskCreated, onTaskCompleted, onPomodoroCompleted } = useWebhookContext();

  // --------------------------------------------------------
  // Task actions
  // --------------------------------------------------------
  const addTask = useCallback((
    title: string,
    projectId: string | null = null,
    priority: Priority = 'none',
    pomodoroEstimate: number = 1,
  ): Task => {
    const now = dateUtils.now();
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      projectId,
      priority,
      dueDate: null,
      reminder: null,
      repeat: 'none',
      repeatCustom: null,
      note: '',
      subtasks: [],
      pomodoroEstimate,
      pomodoroCompleted: 0,
      totalFocusTime: 0,
      completed: false,
      flagged: false,
      tags: [],
      createdAt: now,
      completedAt: null,
      updatedAt: now,
    };
    setTasks((prev) => [...prev, newTask]);
    onTaskCreated(newTask);
    return newTask;
  }, [setTasks, onTaskCreated]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: dateUtils.now() } : t,
      ),
    );
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTaskId((prev) => (prev === id ? null : prev));
  }, [setTasks, setSelectedTaskId]);

  const completeTask = useCallback((id: string): Task | null => {
    // Tính task hoàn thành từ state hiện tại (không phụ thuộc updater chạy
    // đồng bộ) để webhook task.completed luôn bắn đúng.
    const target = tasks.find((t) => t.id === id);
    if (!target) return null;
    const now = dateUtils.now();
    const completed: Task = {
      ...target,
      completed: true,
      completedAt: now,
      updatedAt: now,
    };
    setTasks((prev) => prev.map((t) => (t.id === id ? completed : t)));
    onTaskCompleted(completed);
    return completed;
  }, [tasks, setTasks, onTaskCompleted]);

  const restoreTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: false, completedAt: null, updatedAt: dateUtils.now() }
          : t,
      ),
    );
  }, [setTasks]);

  // --------------------------------------------------------
  // Pomodoro session - lưu tập trung tại đây để đồng bộ DB
  // (bảng system_logs) và để Report đọc dữ liệu thật.
  // --------------------------------------------------------
  const addPomodoroSession = useCallback((session: PomodoroSession) => {
    setPomodoroSessions((prev) => [session, ...prev].slice(0, 200));
    if (session.type === 'focus' && session.completed) {
      onPomodoroCompleted(session);
    }
  }, [setPomodoroSessions, onPomodoroCompleted]);

  // --------------------------------------------------------
  // Subtask actions
  // --------------------------------------------------------
  const addSubtask = useCallback((taskId: string, title: string) => {
    const subtask: Subtask = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: dateUtils.now(),
    };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, subtask], updatedAt: dateUtils.now() }
          : t,
      ),
    );
  }, [setTasks]);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed: !s.completed } : s,
              ),
              updatedAt: dateUtils.now(),
            }
          : t,
      ),
    );
  }, [setTasks]);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
              updatedAt: dateUtils.now(),
            }
          : t,
      ),
    );
  }, [setTasks]);

  // --------------------------------------------------------
  // Project actions
  // --------------------------------------------------------
  const addProject = useCallback((name: string, color: string, folderId: string | null = null): Project => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      color,
      isVisible: true,
      taskCount: 0,
      folderId,
      createdAt: dateUtils.now(),
    };
    setProjects((prev) => [...prev, newProject]);
    if (folderId) {
      setFolders((prev) => prev.map(f => f.id === folderId ? { ...f, projectIds: [...f.projectIds, newProject.id] } : f));
    }
    return newProject;
  }, [setProjects, setFolders]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  }, [setProjects]);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setFolders((prev) => prev.map(f => ({ ...f, projectIds: f.projectIds.filter(pid => pid !== id) })));
    // Gỡ liên kết task khỏi project bị xoá
    setTasks((prev) =>
      prev.map((t) =>
        t.projectId === id ? { ...t, projectId: null, updatedAt: dateUtils.now() } : t,
      ),
    );
  }, [setProjects, setFolders, setTasks]);

  // --------------------------------------------------------
  // Folder actions
  // --------------------------------------------------------
  const addFolder = useCallback((name: string, color: string): Folder => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      color,
      projectIds: [],
      createdAt: dateUtils.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  }, [setFolders]);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, [setFolders]);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setProjects((prev) => prev.map((p) => p.folderId === id ? { ...p, folderId: null } : p));
  }, [setFolders, setProjects]);

  // --------------------------------------------------------
  // Tag actions
  // --------------------------------------------------------
  const addTag = useCallback((name: string, color: string): Tag => {
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name,
      color,
      createdAt: dateUtils.now(),
    };
    setTags((prev) => [...prev, newTag]);
    return newTag;
  }, [setTags]);

  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, [setTags]);

  const deleteTag = useCallback((id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    setTasks((prev) => prev.map((task) =>
      task.tags.includes(id) ? { ...task, tags: task.tags.filter(tid => tid !== id), updatedAt: dateUtils.now() } : task
    ));
  }, [setTags, setTasks]);

  // --------------------------------------------------------
  // Lấy tên project theo id
  // --------------------------------------------------------
  const getProjectName = useCallback(
    (projectId: string | null): string => {
      if (!projectId) return 'Inbox';
      return projects.find((p) => p.id === projectId)?.name ?? 'Inbox';
    },
    [projects],
  );

  // --------------------------------------------------------
  // Đồng bộ với DB (nguồn dữ liệu chính)
  // --------------------------------------------------------
  const [remoteSyncEnabled, setRemoteSyncEnabled] = useState<boolean>(false);
  const lastSavedStateRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;

    async function loadRemoteState() {
      try {
        const remoteState = await loadRemoteAppState();
        if (!mounted) return;

        if (remoteState) {
          setTasks(remoteState.tasks);
          setProjects(
            remoteState.projects.length > 0 ? remoteState.projects : DEFAULT_PROJECTS,
          );
          setFolders(remoteState.folders || []);
          setTags(remoteState.tags || []);
          setPomodoroSessions(remoteState.pomodoroSessions || []);
          setSelectedTaskId(remoteState.selectedTaskId);

          // Settings từ DB là nguồn chính - đẩy vào AppContext
          if (remoteState.settings) {
            updateSettings(remoteState.settings);
          }

          // Không ghi đè state UI (activeView, activeProjectId, searchQuery) từ DB
          // Điều này giúp bảo toàn URL routing hiện tại và không làm hỏng Deep Linking.
          // setActiveView(remoteState.activeView);
          // setActiveProjectId(remoteState.activeProjectId);
          // setSearchQuery(remoteState.searchQuery);
        }

        setRemoteSyncEnabled(true);
      } catch (error) {
        console.warn('Remote DB sync unavailable:', error);
        setRemoteSyncEnabled(false);
      }
    }

    loadRemoteState();

    return () => {
      mounted = false;
    };
    // Chỉ load MỘT LẦN khi mount. Không phụ thuộc các setter của
    // useLocalStorage vì chúng đổi identity mỗi khi giá trị thay đổi,
    // khiến effect chạy lại và ghi đè state người dùng (vd: click chọn
    // task xong bị reset selectedTaskId về null từ DB -> panel biến mất).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!remoteSyncEnabled) return;

    const currentState: RemoteAppState = {
      tasks,
      projects,
      folders,
      tags,
      settings,
      pomodoroSessions,
      selectedTaskId,
      activeView,
      activeProjectId,
      searchQuery,
    };

    const stateStr = JSON.stringify(currentState);
    if (stateStr === lastSavedStateRef.current) {
      return; // State hasn't changed, skip auto-save
    }

    const timeoutId = window.setTimeout(() => {
      lastSavedStateRef.current = stateStr;
      saveRemoteAppState(currentState).catch((error) => {
        console.warn('Unable to save state to remote DB:', error);
      });

      // External API sync (tuỳ chọn) - đẩy toàn bộ state ra API ngoài
      if (settings.externalApiEnabled && settings.externalApiUrl) {
        fetch(settings.externalApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'focus-todo', state: currentState }),
        }).catch((error) => {
          console.warn('External API sync failed:', error);
        });
      }
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [tasks, projects, folders, tags, settings, pomodoroSessions, selectedTaskId, activeView, activeProjectId, searchQuery, remoteSyncEnabled]);

  const hasValidDueDate = (task: Task) =>
    typeof task.dueDate === 'string' && task.dueDate.trim() !== '';

  const getFilteredTasks = useCallback((): Task[] => {
    let filtered: Task[] = [];

    switch (activeView) {
      case 'today':
        filtered = tasks.filter(
          (t) => !t.completed && dateUtils.isToday(t.dueDate),
        );
        break;

      case 'tomorrow':
        filtered = tasks.filter((t) => !t.completed && dateUtils.isTomorrow(t.dueDate));
        break;

      case 'this-week':
        filtered = tasks.filter((t) => !t.completed && dateUtils.isThisWeek(t.dueDate));
        break;

      case 'planned':
        // Tất cả task có dueDate hợp lệ, chưa hoàn thành
        filtered = tasks.filter((t) => !t.completed && hasValidDueDate(t));
        break;

      case 'completed':
        // Task đã hoàn thành, sắp xếp completedAt giảm dần, lấy 100 cái gần nhất
        filtered = tasks
          .filter((t) => t.completed)
          .sort((a, b) => {
            const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return tb - ta;
          })
          .slice(0, 100);
        break;

      case 'high-priority':
        filtered = tasks.filter((t) => !t.completed && t.priority === 'high');
        break;

      case 'medium-priority':
        filtered = tasks.filter((t) => !t.completed && t.priority === 'medium');
        break;

      case 'low-priority':
        filtered = tasks.filter((t) => !t.completed && t.priority === 'low');
        break;

      case 'project':
        filtered = tasks.filter(
          (t) => !t.completed && t.projectId === activeProjectId,
        );
        break;

      case 'tag':
        // Filter theo tag duoc chon
        filtered = tasks.filter(
          (t) => !t.completed && activeTagId !== null && (t.tags || []).includes(activeTagId),
        );
        break;

      case 'folder': {
        // Filter task thuoc cac project trong folder duoc chon
        const folderObj = folders.find((f) => f.id === activeFolderId);
        const folderProjectIds = folderObj ? folderObj.projectIds : [];
        filtered = tasks.filter(
          (t) => !t.completed && t.projectId !== null && folderProjectIds.includes(t.projectId),
        );
        break;
      }

      default:
        // Tất cả task chưa hoàn thành
        filtered = tasks.filter((t) => !t.completed);
        break;
    }

    // Áp dụng searchQuery - tìm trong title và note
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.note ?? '').toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [tasks, activeView, activeProjectId, activeTagId, activeFolderId, folders, searchQuery]);

  // --------------------------------------------------------
  // Giá trị Context (memoized để tránh re-render không cần thiết)
  // --------------------------------------------------------
  const value = useMemo<TaskContextType>(
    () => ({
      tasks,
      projects,
      folders,
      tags,
      pomodoroSessions,
      selectedTaskId,
      activeView,
      activeProjectId,
      activeTagId,
      activeFolderId,
      searchQuery,
      setSelectedTaskId,
      setActiveView,
      setActiveProjectId,
      setActiveTagId,
      setActiveFolderId,
      setSearchQuery,
      addTask,
      updateTask,
      deleteTask,
      completeTask,
      restoreTask,
      addProject,
      updateProject,
      deleteProject,
      addFolder,
      updateFolder,
      deleteFolder,
      addTag,
      updateTag,
      deleteTag,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      addPomodoroSession,
      getFilteredTasks,
      getProjectName,
    }),
    [
      tasks, projects, folders, tags, pomodoroSessions, selectedTaskId,
      activeView, activeProjectId, activeTagId, activeFolderId, searchQuery,
      setSelectedTaskId, setActiveView, setActiveProjectId, setActiveTagId, setActiveFolderId, setSearchQuery,
      addTask, updateTask, deleteTask, completeTask, restoreTask,
      addProject, updateProject, deleteProject,
      addFolder, updateFolder, deleteFolder,
      addTag, updateTag, deleteTag,
      addSubtask, toggleSubtask, deleteSubtask, addPomodoroSession,
      getFilteredTasks, getProjectName,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

// ----------------------------------------------------------
// Custom hook tiện lợi
// ----------------------------------------------------------
export function useTaskContext(): TaskContextType {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error('useTaskContext phải được dùng bên trong TaskProvider');
  }
  return ctx;
}
