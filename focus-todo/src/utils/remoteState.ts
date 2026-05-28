import type { AppState } from '../types';

export async function loadRemoteAppState(): Promise<AppState | null> {
  const response = await fetch('/api/state');
  if (!response.ok) {
    throw new Error(`Remote state request failed: ${response.statusText}`);
  }

  const payload = await response.json();
  const state = payload?.state;
  if (!state) {
    return null;
  }

  return state as AppState;
}

export async function saveRemoteAppState(state: Partial<AppState>): Promise<void> {
  await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
}
