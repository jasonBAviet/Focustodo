// ============================================================
// FOCUS TO-DO - TaskContext
// Quản lý toàn bộ trạng thái Task và Project trong ứng dụng
// ============================================================
import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import type {
  Task,
  Project,
  ViewType,
  Priority,
  Subtask,
} from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { dateUtils } from '../utils/dateUtils';

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
  selectedTaskId: string | null;
  activeView: ViewType;
  activeProjectId: string | null;
  searchQuery: string;
  setSelectedTaskId: (id: string | null) => void;
  setActiveView: (view: ViewType) => void;
  setActiveProjectId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  addTask: (title: string, projectId?: string | null, priority?: Priority) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => Task | null;
  restoreTask: (id: string) => void;
  addProject: (name: string, color: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
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
  const [selectedTaskId, setSelectedTaskId] = useLocalStorage<string | null>('focus-selected-task', null);
  const [activeView, setActiveView] = useLocalStorage<ViewType>('focus-active-view', 'today');
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('focus-active-project', null);
  const [searchQuery, setSearchQuery] = useLocalStorage<string>('focus-search', '');

  // --------------------------------------------------------
  // Task actions
  // --------------------------------------------------------
  const addTask = useCallback((
    title: string,
    projectId: string | null = null,
    priority: Priority = 'none',
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
      pomodoroEstimate: 1,
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
    return newTask;
  }, [setTasks]);

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
    let completed: Task | null = null;
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === id) {
          completed = {
            ...t,
            completed: true,
            completedAt: dateUtils.now(),
            updatedAt: dateUtils.now(),
          };
          return completed;
        }
        return t;
      });
      return updated;
    });
    return completed;
  }, [setTasks]);

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
  const addProject = useCallback((name: string, color: string): Project => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      color,
      isVisible: true,
      taskCount: 0,
      createdAt: dateUtils.now(),
    };
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  }, [setProjects]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  }, [setProjects]);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    // Gỡ liên kết task khỏi project bị xoá
    setTasks((prev) =>
      prev.map((t) =>
        t.projectId === id ? { ...t, projectId: null, updatedAt: dateUtils.now() } : t,
      ),
    );
  }, [setProjects, setTasks]);

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
  // Logic lọc task theo view + searchQuery
  // --------------------------------------------------------
  const getFilteredTasks = useCallback((): Task[] => {
    let filtered: Task[] = [];

    switch (activeView) {
      case 'today':
        // Tasks có dueDate hôm nay HOẶC không có dueDate nhưng tạo hôm nay, chưa hoàn thành
        filtered = tasks.filter(
          (t) =>
            !t.completed &&
            (dateUtils.isToday(t.dueDate) ||
              (!t.dueDate && dateUtils.isToday(t.createdAt))),
        );
        break;

      case 'tomorrow':
        filtered = tasks.filter((t) => !t.completed && dateUtils.isTomorrow(t.dueDate));
        break;

      case 'this-week':
        filtered = tasks.filter((t) => !t.completed && dateUtils.isThisWeek(t.dueDate));
        break;

      case 'planned':
        // Tất cả task có dueDate bất kỳ, chưa hoàn thành
        filtered = tasks.filter((t) => !t.completed && t.dueDate !== null);
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
          t.note.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [tasks, activeView, activeProjectId, searchQuery]);

  // --------------------------------------------------------
  // Giá trị Context (memoized để tránh re-render không cần thiết)
  // --------------------------------------------------------
  const value = useMemo<TaskContextType>(
    () => ({
      tasks,
      projects,
      selectedTaskId,
      activeView,
      activeProjectId,
      searchQuery,
      setSelectedTaskId,
      setActiveView,
      setActiveProjectId,
      setSearchQuery,
      addTask,
      updateTask,
      deleteTask,
      completeTask,
      restoreTask,
      addProject,
      updateProject,
      deleteProject,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      getFilteredTasks,
      getProjectName,
    }),
    [
      tasks, projects, selectedTaskId, activeView, activeProjectId, searchQuery,
      setSelectedTaskId, setActiveView, setActiveProjectId, setSearchQuery,
      addTask, updateTask, deleteTask, completeTask, restoreTask,
      addProject, updateProject, deleteProject,
      addSubtask, toggleSubtask, deleteSubtask,
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
