import { useState, useEffect, useCallback } from 'react';
import type { PomodoroSession } from '../types';
import { loadRemoteAppState, saveRemoteAppState } from '../utils/remoteState';

export function usePomodoroSessions() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [remoteSyncEnabled, setRemoteSyncEnabled] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    async function loadSessions() {
      try {
        const state = await loadRemoteAppState();
        if (mounted && state && state.pomodoroSessions) {
          setSessions(state.pomodoroSessions);
        }
        if (mounted) setRemoteSyncEnabled(true);
      } catch (error) {
        console.warn('Failed to load pomodoro sessions from DB:', error);
      }
    }
    loadSessions();
    return () => { mounted = false; };
  }, []);

  const addSession = useCallback((session: PomodoroSession) => {
    setSessions((prev) => {
      const next = [session, ...prev].slice(0, 500); // keep history reasonable
      if (remoteSyncEnabled) {
        saveRemoteAppState({ pomodoroSessions: next }).catch(e => console.warn('Failed to save sessions:', e));
      }
      return next;
    });
  }, [remoteSyncEnabled]);

  return [sessions, addSession] as const;
}
