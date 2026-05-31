import type { Project, Task, Folder, Tag, ViewType, Settings, PomodoroSession } from '../types';

export interface RemoteAppState {
  tasks: Task[];
  projects: Project[];
  folders: Folder[];
  tags: Tag[];
  settings: Settings | null;
  pomodoroSessions: PomodoroSession[];
  selectedTaskId: string | null;
  activeView: ViewType;
  activeProjectId: string | null;
  searchQuery: string;
}

export async function loadRemoteAppState(): Promise<RemoteAppState | null> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  const url = `${backendUrl}/api/state`;
  const response = await fetch(url);
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
    selectedTaskId: state.selectedTaskId ?? null,
    activeView: state.activeView ?? 'today',
    activeProjectId: state.activeProjectId ?? null,
    searchQuery: state.searchQuery ?? '',
  };
}

export async function saveRemoteAppState(state: RemoteAppState): Promise<void> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  const url = `${backendUrl}/api/state`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
}
