// ============================================================
// FOCUS TO-DO - TYPE DEFINITIONS
// ============================================================

export type Priority = 'high' | 'medium' | 'low' | 'none';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type PomodoroPhase = 'idle' | 'focus' | 'short-break' | 'long-break';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type ViewType =
  | 'today'
  | 'tomorrow'
  | 'this-week'
  | 'planned'
  | 'events'
  | 'completed'
  | 'all'
  | 'someday'
  | 'high-priority'
  | 'medium-priority'
  | 'low-priority'
  | 'project'
  | 'tag'
  | 'folder'
  | 'knowledge'
  | 'unassigned';

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
  attachments?: Omit<Attachment, 'taskId'>[];
}

export interface Task {
  id: string;
  title: string;
  projectId: string | null;
  priority: Priority;
  dueDate: string | null;
  reminder: string | null;
  repeat: RepeatType;
  repeatCustom: string | null;
  note: string;
  subtasks: Subtask[];
  pomodoroEstimate: number;
  pomodoroCompleted: number;
  totalFocusTime: number; // in minutes
  completed: boolean;
  flagged: boolean;
  tags: string[];
  position?: number; // drag-and-drop order in project
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface Knowledge {
  id: string;
  title: string;
  projectId: string | null;
  priority: Priority;
  dueDate: string | null;
  reminder: string | null;
  repeat: RepeatType;
  repeatCustom: string | null;
  note: string;
  subtasks: Subtask[];
  pomodoroEstimate: number;
  pomodoroCompleted: number;
  totalFocusTime: number; // in minutes
  completed: boolean;
  flagged: boolean;
  tags: string[];
  position?: number;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface Project {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  taskCount: number;
  folderId?: string | null;
  position?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  projectIds: string[];
  parentId?: string | null; // parent folder (nested); null = root
  position?: number;
  isVisible?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  projectId?: string | null; // tag belongs to project (null = unassigned)
  folderId?: string | null; // tag belongs to folder (null = unassigned); both null = global
  isVisible?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PomodoroSession {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  type: 'focus' | 'short-break' | 'long-break';
  duration: number; // in minutes
  startTime: string;
  endTime: string;
  completed: boolean;
}

export interface PomodoroRecord {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  startTime: string;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface WebhookEvent {
  id: string;
  eventType: 'task.created' | 'task.completed' | 'pomodoro.completed' | 'task.reminded';
  payload: Record<string, unknown>;
  timestamp: string;
  status: 'success' | 'error';
  statusCode?: number;
  error?: string;
}

export interface Settings {
  // Pomodoro
  pomodoroLength: number;
  shortBreakLength: number;
  longBreakLength: number;
  longBreakAfter: number;
  autoStartNextPomodoro: boolean;
  autoStartBreak: boolean;
  disableBreak: boolean;
  alarmSound: boolean;
  // Appearance
  darkMode: ThemeMode;
  themeWallpaper: string;
  accentColor: string;
  // Webhook & API
  webhookUrl: string;
  webhookEnabled: boolean;
  externalApiUrl: string;
  externalApiEnabled: boolean;
  // Focus Goal
  dailyFocusGoalHours: number;
  // Visible views in sidebar
  visibleViews: Record<string, boolean>;
  // Calendar preferences
  calendarScale: 'month' | 'week' | 'day';
  calendarDateField: 'dueDate' | 'createdAt';
}

export interface AppState {
  tasks: Task[];
  knowledges: Knowledge[];
  projects: Project[];
  folders: Folder[];
  tags: Tag[];
  pomodoroSessions: PomodoroSession[];
  pomodoroRecords: PomodoroRecord[];
  attachments: Attachment[];
  webhookEvents: WebhookEvent[];
  settings: Settings;
  selectedTaskId: string | null;
  activeView: ViewType;
  activeProjectId: string | null;
  searchQuery: string;
}

export interface TaskFilter {
  view: ViewType;
  projectId: string | null;
  searchQuery: string;
}

export interface ReportStats {
  totalFocusTime: number;
  weekFocusTime: number;
  todayFocusTime: number;
  totalCompleted: number;
  weekCompleted: number;
  todayCompleted: number;
}

// ----------------------------------------------------------
// Read Vite environment variables (injected at build/dev)
// VITE_* variables in .env will be replaced at compile time
// ----------------------------------------------------------
const _envWebhookUrl: string = import.meta.env.VITE_SLACK_WEBHOOK_URL ?? '';
const _envExternalApiUrl: string = import.meta.env.VITE_EXTERNAL_API_URL ?? '';

export const DEFAULT_SETTINGS: Settings = {
  pomodoroLength: 25,
  shortBreakLength: 5,
  longBreakLength: 15,
  longBreakAfter: 4,
  autoStartNextPomodoro: false,
  autoStartBreak: false,
  disableBreak: false,
  alarmSound: true,
  darkMode: 'dark',
  themeWallpaper: 'dark-forest',
  accentColor: '#f25f5c',
  // If .env has value then use, otherwise leave empty
  webhookUrl: _envWebhookUrl,
  webhookEnabled: _envWebhookUrl.length > 0,
  externalApiUrl: _envExternalApiUrl,
  externalApiEnabled: _envExternalApiUrl.length > 0,
  dailyFocusGoalHours: 3,
  calendarScale: 'month',
  calendarDateField: 'dueDate',
  visibleViews: {
    today: true,
    tomorrow: true,
    'this-week': true,
    planned: true,
    events: true,
    completed: true,
    all: false,
    someday: false,
    'high-priority': false,
    'medium-priority': false,
    'low-priority': false,
    'unassigned': true,
  },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  high: { label: 'High priority', color: '#f25f5c' },
  medium: { label: 'Medium priority', color: '#f4a261' },
  low: { label: 'Low priority', color: '#2ec4b6' },
  none: { label: 'No priority', color: '#888' },
};

export const PROJECT_COLORS = [
  '#7ec8e3', '#4361ee', '#00c5cd', '#f4a261', '#e63946',
  '#ff006e', '#e040fb', '#7cb518', '#06d6a0', '#ff9f1c',
  '#4cc9f0', '#7209b7', '#3a0ca3', '#f72585', '#b5e48c',
  '#90e0ef', '#48cae4', '#023e8a', '#8d99ae', '#2b2d42',
];
