import type { Project, Task, Folder, Tag, ViewType, Settings, PomodoroSession, Attachment, PomodoroRecord } from '../types';
import { getApiBaseUrl } from './capacitorConfig';
import { loadTokenSync } from './secureStorage';

function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = loadTokenSync();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch(path: string, method: string, body?: unknown): Promise<void> {
  const url = `${getApiBaseUrl()}${path}`;
  const res = await fetch(url, {
    method,
    headers: getHeaders(body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
}

// ---- Tags ----
export const createTagRemote = (t: Tag): Promise<void> =>
  apiFetch('/api/tags', 'POST', { id: t.id, name: t.name, color: t.color, projectId: t.projectId ?? null, folderId: t.folderId ?? null, isVisible: t.isVisible ?? true });

export const updateTagRemote = (id: string, u: Partial<Tag>): Promise<void> =>
  apiFetch(`/api/tags/${encodeURIComponent(id)}`, 'PUT', u);

export const deleteTagRemote = (id: string): Promise<void> =>
  apiFetch(`/api/tags/${encodeURIComponent(id)}`, 'DELETE');

// ---- Projects ----
export const createProjectRemote = (p: Project): Promise<void> =>
  apiFetch('/api/projects', 'POST', { id: p.id, name: p.name, color: p.color, isVisible: p.isVisible, folderId: p.folderId ?? null });

export const updateProjectRemote = (id: string, u: Partial<Project>): Promise<void> =>
  apiFetch(`/api/projects/${encodeURIComponent(id)}`, 'PUT', u);

export const deleteProjectRemote = (id: string): Promise<void> =>
  apiFetch(`/api/projects/${encodeURIComponent(id)}`, 'DELETE');

// ---- Folders ----
export const createFolderRemote = (f: Folder): Promise<void> =>
  apiFetch('/api/folders', 'POST', { id: f.id, name: f.name, color: f.color, projectIds: f.projectIds, parentId: f.parentId ?? null, isVisible: f.isVisible ?? true });

export const updateFolderRemote = (id: string, u: Partial<Folder>): Promise<void> =>
  apiFetch(`/api/folders/${encodeURIComponent(id)}`, 'PUT', u);

export const deleteFolderRemote = (id: string): Promise<void> =>
  apiFetch(`/api/folders/${encodeURIComponent(id)}`, 'DELETE');

export async function completeTaskRemote(id: string, completed = true): Promise<Task | null> {
  const url = `${getApiBaseUrl()}/api/tasks/${encodeURIComponent(id)}/complete`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) throw new Error(`complete failed: ${res.statusText}`);
  const json = await res.json();
  return (json?.spawned ?? null) as Task | null;
}

export interface DeletedIds {
  tasks: string[];
  projects: string[];
  folders: string[];
  tags: string[];
  attachments: string[];
  pomodoroRecords: string[];
}

export interface RemoteAppState {
  tasks: Task[];
  projects: Project[];
  folders: Folder[];
  tags: Tag[];
  settings: Settings | null;
  pomodoroSessions: PomodoroSession[];
  pomodoroRecords: PomodoroRecord[];
  attachments: Attachment[];
  selectedTaskId: string | null;
  activeView: ViewType;
  activeProjectId: string | null;
  searchQuery: string;
  deletedIds?: DeletedIds;
}

export interface ChangesResponse {
  now: string;
  changes: {
    tasks: Task[];
    projects: Project[];
    folders: Folder[];
    tags: Tag[];
    attachments: Attachment[];
    pomodoroRecords: PomodoroRecord[];
  };
  deletedIds: {
    tasks: string[];
    projects: string[];
    folders: string[];
    tags: string[];
    attachments: string[];
    pomodoroRecords: string[];
  };
}

function backendBase(): string {
  return getApiBaseUrl();
}

export async function loadRemoteAppState(): Promise<RemoteAppState | null> {
  const url = `${backendBase()}/api/state`;
  const response = await fetch(url, {
    headers: getHeaders()
  });
  if (!response.ok) {
    throw new Error(`Remote state request failed: ${response.statusText}`);
  }

  const payload = await response.json();
  const state = payload?.state;
  if (!state) {
    return null;
  }

  return {
    tasks: state.tasks ?? [],
    projects: state.projects ?? [],
    folders: state.folders ?? [],
    tags: state.tags ?? [],
    settings: state.settings ?? null,
    pomodoroSessions: state.pomodoroSessions ?? [],
    pomodoroRecords: state.pomodoroRecords ?? [],
    attachments: state.attachments ?? [],
    selectedTaskId: state.selectedTaskId ?? null,
    activeView: state.activeView ?? 'today',
    activeProjectId: state.activeProjectId ?? null,
    searchQuery: state.searchQuery ?? '',
  };
}

export async function saveRemoteAppState(state: RemoteAppState): Promise<void> {
  const url = `${backendBase()}/api/state`;
  await fetch(url, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ state }),
  });
}

export async function fetchChanges(since: string | null): Promise<ChangesResponse | null> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  const url = `${backendBase()}/api/changes${qs}`;
  const response = await fetch(url, {
    headers: getHeaders()
  });
  if (!response.ok) {
    throw new Error(`Changes request failed: ${response.statusText}`);
  }
  return (await response.json()) as ChangesResponse;
}
