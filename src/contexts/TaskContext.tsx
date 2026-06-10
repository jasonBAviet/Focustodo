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
  Attachment,
} from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { dateUtils } from '../utils/dateUtils';
import { uuid } from '../utils/uuid';
import { loadRemoteAppState, saveRemoteAppState, fetchChanges, completeTaskRemote } from '../utils/remoteState';
import type { RemoteAppState, DeletedIds, ChangesResponse } from '../utils/remoteState';
import { getDescendantFolderIds } from '../utils/folderUtils';
import { useAppContext } from './AppContext';
import { useWebhookContext } from './WebhookContext';

// ----------------------------------------------------------
// Merge delta từ /api/changes vào danh sách cục bộ theo last-write-wins.
//  - dead: id tombstone -> gỡ khỏi local (trừ khi đang trong hàng đợi xoá cục bộ).
//  - live: thêm mới / ghi đè nếu updatedAt mới hơn; bỏ qua id đang mở (skipId)
//    và id vừa xoá cục bộ (pending) để không "hồi sinh".
// Trả về `prev` nguyên vẹn nếu không có gì đổi (tránh re-render/save thừa).
// ----------------------------------------------------------
function mergeList<T extends { id: string; updatedAt?: string | null }>(
  prev: T[],
  live: T[],
  dead: string[],
  pending: string[],
  skipId: string | null,
): T[] {
  let changed = false;
  const map = new Map(prev.map((x) => [x.id, x]));
  for (const id of dead) {
    if (!pending.includes(id) && map.has(id)) {
      map.delete(id);
      changed = true;
    }
  }
  for (const row of live) {
    if (pending.includes(row.id)) continue;
    const cur = map.get(row.id);
    if (!cur) {
      map.set(row.id, row);
      changed = true;
      continue;
    }
    if (skipId && row.id === skipId) continue;
    const a = cur.updatedAt ?? '';
    const b = row.updatedAt ?? '';
    if (b > a) {
      map.set(row.id, row);
      changed = true;
    }
  }
  return changed ? Array.from(map.values()) : prev;
}

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
// Bộ lọc nâng cao (áp dụng cộng dồn cho mọi view)
// ----------------------------------------------------------
export interface TaskFilters {
  text: string;
  tagIds: string[];
  projectIds: string[];
  createdFrom: string | null; // 'YYYY-MM-DD'
  createdTo: string | null;
  dueFrom: string | null;
  dueTo: string | null;
}

export const EMPTY_FILTERS: TaskFilters = {
  text: '',
  tagIds: [],
  projectIds: [],
  createdFrom: null,
  createdTo: null,
  dueFrom: null,
  dueTo: null,
};

// ----------------------------------------------------------
// Kiểu dữ liệu Context
// ----------------------------------------------------------
interface TaskContextType {
  tasks: Task[];
  projects: Project[];
  folders: Folder[];
  tags: Tag[];
  pomodoroSessions: PomodoroSession[];
  attachments: Attachment[];
  selectedTaskId: string | null;
  activeView: ViewType;
  activeProjectId: string | null;
  activeTagId: string | null;
  activeFolderId: string | null;
  searchQuery: string;
  filters: TaskFilters;
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
  addTag: (name: string, color: string) => Tag;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addPomodoroSession: (session: PomodoroSession) => void;
  addAttachment: (attachment: Attachment) => void;
  deleteAttachment: (id: string) => void;
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
  const [attachments, setAttachments] = useLocalStorage<Attachment[]>('focus-attachments', []);
  const [selectedTaskId, setSelectedTaskId] = useLocalStorage<string | null>('focus-selected-task', null);
  const [activeView, setActiveView] = useLocalStorage<ViewType>('focus-active-view', 'today');
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('focus-active-project', null);
  const [activeTagId, setActiveTagId] = useLocalStorage<string | null>('focus-active-tag', null);
  const [activeFolderId, setActiveFolderId] = useLocalStorage<string | null>('focus-active-folder', null);
  const [searchQuery, setSearchQuery] = useLocalStorage<string>('focus-search', '');

  // Bộ lọc nâng cao - giữ thuần client (KHÔNG persist / KHÔNG đồng bộ DB),
  // reset khi reload để tránh lọt vào payload reconcile của /api/state.
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);

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
    isKnowledge: boolean = false,
  ): Task => {
    const now = dateUtils.now();
    const newTask: Task = {
      id: uuid(),
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
      isKnowledge,
    };
    setTasks((prev) => {
      // Vị trí kế tiếp trong cùng dự án (cuối danh sách).
      const pos = prev
        .filter((t) => (t.projectId ?? null) === (projectId ?? null))
        .reduce((m, t) => Math.max(m, t.position ?? 0), -1) + 1;
      return [...prev, { ...newTask, position: pos }];
    });
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
    deletedIdsRef.current.tasks.push(id);
    // Xoá các attachments cục bộ liên kết với task
    setAttachments((prev) => {
      const targets = prev.filter((a) => a.taskId === id);
      targets.forEach((a) => {
        deletedIdsRef.current.attachments.push(a.id);
      });
      return prev.filter((a) => a.taskId !== id);
    });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTaskId((prev) => (prev === id ? null : prev));
  }, [setTasks, setAttachments, setSelectedTaskId]);

  const reorderTasks = useCallback((orderedIds: string[]) => {
    const now = dateUtils.now();
    const posMap = new Map(orderedIds.map((id, i) => [id, i]));
    setTasks((prev) =>
      prev.map((t) => (posMap.has(t.id) ? { ...t, position: posMap.get(t.id)!, updatedAt: now } : t)),
    );
  }, [setTasks]);

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
    // Task lặp: nhờ server sinh occurrence kế tiếp (1 điểm sinh duy nhất),
    // rồi chèn task mới vào state cục bộ. Bỏ qua nếu offline/lỗi.
    if (target.repeat && target.repeat !== 'none') {
      completeTaskRemote(id)
        .then((spawned) => {
          if (spawned) {
            setTasks((prev) => (prev.some((t) => t.id === spawned.id) ? prev : [...prev, spawned]));
          }
        })
        .catch(() => { /* offline hoặc task chưa kịp lưu -> bỏ qua, không chặn UI */ });
    }
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
  // Attachment actions
  // --------------------------------------------------------
  const addAttachment = useCallback((attachment: Attachment) => {
    setAttachments((prev) => [...prev, attachment]);
  }, [setAttachments]);

  const deleteAttachment = useCallback((id: string) => {
    deletedIdsRef.current.attachments.push(id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, [setAttachments]);

  // --------------------------------------------------------
  // Subtask actions
  // --------------------------------------------------------
  const addSubtask = useCallback((taskId: string, title: string) => {
    const subtask: Subtask = {
      id: uuid(),
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
    const now = dateUtils.now();
    const newProject: Project = {
      id: uuid(),
      name,
      color,
      isVisible: true,
      taskCount: 0,
      folderId,
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => {
      const pos = prev
        .filter((p) => (p.folderId ?? null) === (folderId ?? null))
        .reduce((m, p) => Math.max(m, p.position ?? 0), -1) + 1;
      return [...prev, { ...newProject, position: pos }];
    });
    if (folderId) {
      setFolders((prev) => prev.map(f => f.id === folderId ? { ...f, projectIds: [...f.projectIds, newProject.id], updatedAt: now } : f));
    }
    return newProject;
  }, [setProjects, setFolders]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: dateUtils.now() } : p)),
    );
  }, [setProjects]);

  const deleteProject = useCallback((id: string) => {
    deletedIdsRef.current.projects.push(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setFolders((prev) => prev.map(f =>
      f.projectIds.includes(id)
        ? { ...f, projectIds: f.projectIds.filter(pid => pid !== id), updatedAt: dateUtils.now() }
        : f,
    ));
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
  const addFolder = useCallback((name: string, color: string, parentId: string | null = null): Folder => {
    const now = dateUtils.now();
    const newFolder: Folder = {
      id: uuid(),
      name,
      color,
      projectIds: [],
      parentId,
      createdAt: now,
      updatedAt: now,
    };
    setFolders((prev) => {
      const pos = prev
        .filter((f) => (f.parentId ?? null) === (parentId ?? null))
        .reduce((m, f) => Math.max(m, f.position ?? 0), -1) + 1;
      return [...prev, { ...newFolder, position: pos }];
    });
    return newFolder;
  }, [setFolders]);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates, updatedAt: dateUtils.now() } : f)));
  }, [setFolders]);

  const deleteFolder = useCallback((id: string) => {
    deletedIdsRef.current.folders.push(id);
    const now = dateUtils.now();
    // Đưa folder con lên gốc (parentId=null) thay vì xoá theo.
    setFolders((prev) => prev.filter((f) => f.id !== id).map((f) => (f.parentId === id ? { ...f, parentId: null, updatedAt: now } : f)));
    setProjects((prev) => prev.map((p) => p.folderId === id ? { ...p, folderId: null, updatedAt: now } : p));
  }, [setFolders, setProjects]);

  // --------------------------------------------------------
  // Tag actions
  // --------------------------------------------------------
  const addTag = useCallback((name: string, color: string): Tag => {
    const now = dateUtils.now();
    const newTag: Tag = {
      id: uuid(),
      name,
      color,
      createdAt: now,
      updatedAt: now,
    };
    setTags((prev) => [...prev, newTag]);
    return newTag;
  }, [setTags]);

  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: dateUtils.now() } : t)));
  }, [setTags]);

  const deleteTag = useCallback((id: string) => {
    deletedIdsRef.current.tags.push(id);
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
  // Hàng đợi xoá mềm tường minh gửi kèm full-state (reconcile đã upsert-only).
  const deletedIdsRef = useRef<DeletedIds>({ tasks: [], projects: [], folders: [], tags: [], attachments: [] });
  // Mốc thời gian cho /api/changes (đặt sau khi load xong).
  const sinceRef = useRef<string | null>(null);
  // Ref selectedTaskId để merge không đè task đang mở mà không cần thêm deps.
  const selectedTaskIdRef = useRef<string | null>(selectedTaskId);
  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

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
          setAttachments(remoteState.attachments || []);
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

        // Mốc cho /api/changes: chỉ lấy thay đổi phát sinh SAU khi đã load.
        sinceRef.current = new Date().toISOString();
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

    // Ảnh chụp hàng đợi xoá mềm để gửi kèm (sao chép để có thể prune sau khi lưu).
    const sentDeleted: DeletedIds = {
      tasks: [...deletedIdsRef.current.tasks],
      projects: [...deletedIdsRef.current.projects],
      folders: [...deletedIdsRef.current.folders],
      tags: [...deletedIdsRef.current.tags],
      attachments: [...deletedIdsRef.current.attachments],
    };

    const currentState: RemoteAppState = {
      tasks,
      projects,
      folders,
      tags,
      settings,
      pomodoroSessions,
      attachments,
      selectedTaskId,
      activeView,
      activeProjectId,
      searchQuery,
      deletedIds: sentDeleted,
    };

    const stateStr = JSON.stringify(currentState);
    if (stateStr === lastSavedStateRef.current) {
      return; // State hasn't changed, skip auto-save
    }

    const timeoutId = window.setTimeout(() => {
      lastSavedStateRef.current = stateStr;
      saveRemoteAppState(currentState)
        .then(() => {
          // Gỡ các id đã xoá thành công khỏi hàng đợi (giữ id mới phát sinh khi đang gửi).
          const drop = (queue: string[], sent: string[]) => queue.filter((id) => !sent.includes(id));
          deletedIdsRef.current.tasks = drop(deletedIdsRef.current.tasks, sentDeleted.tasks);
          deletedIdsRef.current.projects = drop(deletedIdsRef.current.projects, sentDeleted.projects);
          deletedIdsRef.current.folders = drop(deletedIdsRef.current.folders, sentDeleted.folders);
          deletedIdsRef.current.tags = drop(deletedIdsRef.current.tags, sentDeleted.tags);
          deletedIdsRef.current.attachments = drop(deletedIdsRef.current.attachments, sentDeleted.attachments);
        })
        .catch((error) => {
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
  }, [tasks, projects, folders, tags, settings, pomodoroSessions, attachments, selectedTaskId, activeView, activeProjectId, searchQuery, remoteSyncEnabled]);

  // --------------------------------------------------------
  // Đồng bộ 2 chiều: poll /api/changes để bắt kịp dữ liệu app ngoài ghi vào
  // (qua /api/tasks, webhook...) mà không cần reload. Merge theo last-write-wins.
  // --------------------------------------------------------
  useEffect(() => {
    if (!remoteSyncEnabled) return;
    let cancelled = false;

    async function poll() {
      try {
        const res: ChangesResponse | null = await fetchChanges(sinceRef.current);
        if (cancelled || !res) return;
        const pd = deletedIdsRef.current;
        const skip = selectedTaskIdRef.current;
        setTasks((prev) => mergeList(prev, res.changes.tasks, res.deletedIds.tasks, pd.tasks, skip));
        setProjects((prev) => mergeList(prev, res.changes.projects, res.deletedIds.projects, pd.projects, null));
        setFolders((prev) => mergeList(prev, res.changes.folders, res.deletedIds.folders, pd.folders, null));
        setTags((prev) => mergeList(prev, res.changes.tags, res.deletedIds.tags, pd.tags, null));
        setAttachments((prev) => mergeList(prev, res.changes.attachments || [], res.deletedIds.attachments || [], pd.attachments, null));
        sinceRef.current = res.now;
      } catch {
        /* mạng chập chờn -> bỏ qua, thử lại lần sau */
      }
    }

    const intervalId = window.setInterval(poll, 25000);
    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);

    // Realtime: nếu bật VITE_ENABLE_SSE, mở EventSource để poll NGAY khi server
    // báo có thay đổi (thay vì chờ 25s). Mặc định tắt vì serverless (Vercel)
    // không giữ kết nối dài; poll vẫn là lớp nền.
    let es: EventSource | null = null;
    if (import.meta.env.VITE_ENABLE_SSE === 'true' && typeof EventSource !== 'undefined') {
      try {
        es = new EventSource(`${import.meta.env.VITE_BACKEND_URL || ''}/api/events`);
        es.onmessage = () => { void poll(); };
        es.onerror = () => { /* EventSource tự reconnect; poll vẫn chạy nền */ };
      } catch {
        es = null;
      }
    }

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      if (es) es.close();
    };
  }, [remoteSyncEnabled, setTasks, setProjects, setFolders, setTags, setAttachments]);

  const hasValidDueDate = (task: Task) =>
    typeof task.dueDate === 'string' && task.dueDate.trim() !== '';

  const getFilteredTasks = useCallback((): Task[] => {
    let filtered: Task[] = [];
    const normalTasks = tasks.filter((t) => !t.isKnowledge);

    switch (activeView) {
      case 'today':
        filtered = normalTasks.filter(
          (t) => !t.completed && dateUtils.isToday(t.dueDate),
        );
        break;

      case 'tomorrow':
        filtered = normalTasks.filter((t) => !t.completed && dateUtils.isTomorrow(t.dueDate));
        break;

      case 'this-week':
        filtered = normalTasks.filter((t) => !t.completed && dateUtils.isThisWeek(t.dueDate));
        break;

      case 'planned':
        // Tất cả task có dueDate hợp lệ, chưa hoàn thành
        filtered = normalTasks.filter((t) => !t.completed && hasValidDueDate(t));
        break;

      case 'completed':
        // Task đã hoàn thành, sắp xếp completedAt giảm dần, lấy 100 cái gần nhất
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

      case 'project':
        filtered = normalTasks.filter(
          (t) => !t.completed && t.projectId === activeProjectId,
        );
        break;

      case 'tag':
        // Filter theo tag duoc chon
        filtered = normalTasks.filter(
          (t) => !t.completed && activeTagId !== null && (t.tags || []).includes(activeTagId),
        );
        break;

      case 'folder': {
        // Task thuộc mọi project trong folder VÀ các folder con (lồng nhiều cấp).
        if (!activeFolderId) {
          filtered = [];
          break;
        }
        const subtreeFolderIds = new Set(getDescendantFolderIds(folders, activeFolderId));
        const folderProjectIds = new Set(
          projects.filter((p) => p.folderId && subtreeFolderIds.has(p.folderId)).map((p) => p.id),
        );
        filtered = normalTasks.filter(
          (t) => !t.completed && t.projectId !== null && folderProjectIds.has(t.projectId),
        );
        break;
      }

      case 'knowledge':
        filtered = tasks.filter((t) => !!t.isKnowledge);
        break;

      default:
        // Tất cả task chưa hoàn thành
        filtered = normalTasks.filter((t) => !t.completed);
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

    // --- Bộ lọc nâng cao (cộng dồn, mỗi bước bỏ qua nếu field rỗng) ---

    // Lọc theo từ khóa (title hoặc note)
    if (filters.text.trim()) {
      const q = filters.text.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.note ?? '').toLowerCase().includes(q),
      );
    }

    // Lọc theo tag (OR - chứa ít nhất một tag đã chọn)
    if (filters.tagIds.length > 0) {
      filtered = filtered.filter((t) =>
        (t.tags || []).some((id) => filters.tagIds.includes(id)),
      );
    }

    // Lọc theo project (OR - thuộc một trong các project đã chọn)
    if (filters.projectIds.length > 0) {
      filtered = filtered.filter(
        (t) => t.projectId !== null && filters.projectIds.includes(t.projectId),
      );
    }

    // Lọc theo khoảng ngày tạo (so sánh chuỗi 'YYYY-MM-DD')
    if (filters.createdFrom || filters.createdTo) {
      filtered = filtered.filter((t) => {
        const d = (t.createdAt || '').slice(0, 10);
        if (!d) return false;
        if (filters.createdFrom && d < filters.createdFrom) return false;
        if (filters.createdTo && d > filters.createdTo) return false;
        return true;
      });
    }

    // Lọc theo khoảng ngày due (loại task không có dueDate khi đặt khoảng)
    if (filters.dueFrom || filters.dueTo) {
      filtered = filtered.filter((t) => {
        const d = (t.dueDate || '').slice(0, 10);
        if (!d) return false;
        if (filters.dueFrom && d < filters.dueFrom) return false;
        if (filters.dueTo && d > filters.dueTo) return false;
        return true;
      });
    }

    return filtered;
  }, [tasks, projects, activeView, activeProjectId, activeTagId, activeFolderId, folders, searchQuery, filters]);

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
      attachments,
      selectedTaskId,
      activeView,
      activeProjectId,
      activeTagId,
      activeFolderId,
      searchQuery,
      filters,
      setFilters,
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
      reorderTasks,
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
      addAttachment,
      deleteAttachment,
      getFilteredTasks,
      getProjectName,
    }),
    [
      tasks, projects, folders, tags, pomodoroSessions, attachments, selectedTaskId,
      activeView, activeProjectId, activeTagId, activeFolderId, searchQuery,
      filters, setFilters,
      setSelectedTaskId, setActiveView, setActiveProjectId, setActiveTagId, setActiveFolderId, setSearchQuery,
      addTask, updateTask, deleteTask, completeTask, restoreTask, reorderTasks,
      addProject, updateProject, deleteProject,
      addFolder, updateFolder, deleteFolder,
      addTag, updateTag, deleteTag,
      addSubtask, toggleSubtask, deleteSubtask, addPomodoroSession,
      addAttachment, deleteAttachment,
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
