import type { Project, Task, Folder, Tag, ViewType } from '../types';

export interface RemoteAppState {
  tasks: Task[];
  projects: Project[];
  folders: Folder[];
  tags: Tag[];
  selectedTaskId: string | null;
  activeView: ViewType;
  activeProjectId: string | null;
  searchQuery: string;
}

export async function loadRemoteAppState(): Promise<RemoteAppState | null> {
  const response = await fetch('/api/state');
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
    selectedTaskId: state.selectedTaskId ?? null,
    activeView: state.activeView ?? 'today',
    activeProjectId: state.activeProjectId ?? null,
    searchQuery: state.searchQuery ?? '',
  };
}

export async function saveRemoteAppState(state: RemoteAppState): Promise<void> {
  await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
}
