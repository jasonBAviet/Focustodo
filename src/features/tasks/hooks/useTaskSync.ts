import { useEffect, useRef, useState } from 'react';
import type { RemoteAppState, DeletedIds, ChangesResponse } from '@/utils/remoteState';
import { loadRemoteAppState, saveRemoteAppState, fetchChanges } from '@/utils/remoteState';

export function mergeList<T extends { id: string; updatedAt?: string | null }>(
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

import type { ViewType } from '@/types';

export interface UseTaskSyncParams {
  tasks: any[]; setTasks: any;
  projects: any[]; setProjects: any;
  folders: any[]; setFolders: any;
  tags: any[]; setTags: any;
  pomodoroSessions: any[]; setPomodoroSessions: any;
  pomodoroRecords: any[]; setPomodoroRecords: any;
  attachments: any[]; setAttachments: any;
  selectedTaskId: string | null; setSelectedTaskId: any;
  activeView: ViewType; activeProjectId: string | null; searchQuery: string;
  settings: any; updateSettings: any;
  deletedIdsRef: React.MutableRefObject<DeletedIds>;
}

export function useTaskSync({
  tasks, setTasks, projects, setProjects, folders, setFolders, tags, setTags,
  pomodoroSessions, setPomodoroSessions, pomodoroRecords, setPomodoroRecords,
  attachments, setAttachments, selectedTaskId, setSelectedTaskId,
  activeView, activeProjectId, searchQuery, settings, updateSettings, deletedIdsRef
}: UseTaskSyncParams) {
  const [remoteSyncEnabled, setRemoteSyncEnabled] = useState<boolean>(false);
  const lastSavedStateRef = useRef<string>('');
  const sinceRef = useRef<string | null>(null);
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
          setProjects(remoteState.projects.length > 0 ? remoteState.projects : []);
          setFolders(remoteState.folders || []);
          setTags(remoteState.tags || []);
          setPomodoroSessions(remoteState.pomodoroSessions || []);
          setPomodoroRecords(remoteState.pomodoroRecords || []);
          setAttachments(remoteState.attachments || []);
          setSelectedTaskId(remoteState.selectedTaskId);
          if (remoteState.settings) {
            updateSettings(remoteState.settings);
          }
        }
        sinceRef.current = new Date().toISOString();
        setRemoteSyncEnabled(true);
      } catch (error) {
        console.warn('Remote DB sync unavailable:', error);
        setRemoteSyncEnabled(false);
      }
    }
    loadRemoteState();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!remoteSyncEnabled) return;
    const sentDeleted: DeletedIds = {
      tasks: [...deletedIdsRef.current.tasks],
      projects: [...deletedIdsRef.current.projects],
      folders: [...deletedIdsRef.current.folders],
      tags: [...deletedIdsRef.current.tags],
      attachments: [...deletedIdsRef.current.attachments],
      pomodoroRecords: [...deletedIdsRef.current.pomodoroRecords],
    };
    const currentState: RemoteAppState = {
      tasks, projects, folders, tags, settings, pomodoroSessions,
      pomodoroRecords, attachments, selectedTaskId, activeView,
      activeProjectId, searchQuery, deletedIds: sentDeleted,
    };
    const stateStr = JSON.stringify(currentState);
    if (stateStr === lastSavedStateRef.current) return;

    const timeoutId = window.setTimeout(() => {
      lastSavedStateRef.current = stateStr;
      saveRemoteAppState(currentState)
        .then(() => {
          const drop = (queue: string[], sent: string[]) => queue.filter((id) => !sent.includes(id));
          deletedIdsRef.current.tasks = drop(deletedIdsRef.current.tasks, sentDeleted.tasks);
          deletedIdsRef.current.projects = drop(deletedIdsRef.current.projects, sentDeleted.projects);
          deletedIdsRef.current.folders = drop(deletedIdsRef.current.folders, sentDeleted.folders);
          deletedIdsRef.current.tags = drop(deletedIdsRef.current.tags, sentDeleted.tags);
          deletedIdsRef.current.attachments = drop(deletedIdsRef.current.attachments, sentDeleted.attachments);
          deletedIdsRef.current.pomodoroRecords = drop(deletedIdsRef.current.pomodoroRecords, sentDeleted.pomodoroRecords);
        })
        .catch((error) => console.warn('Unable to save state:', error));

      if (settings.externalApiEnabled && settings.externalApiUrl) {
        fetch(settings.externalApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'focus-todo', state: currentState }),
        }).catch(() => {});
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [tasks, projects, folders, tags, settings, pomodoroSessions, pomodoroRecords, attachments, selectedTaskId, activeView, activeProjectId, searchQuery, remoteSyncEnabled]);

  useEffect(() => {
    if (!remoteSyncEnabled) return;
    let cancelled = false;
    async function poll() {
      try {
        const res: ChangesResponse | null = await fetchChanges(sinceRef.current);
        if (cancelled || !res) return;
        const pd = deletedIdsRef.current;
        const skip = selectedTaskIdRef.current;
        setTasks((prev: any) => mergeList(prev, res.changes.tasks, res.deletedIds.tasks, pd.tasks, skip));
        setProjects((prev: any) => mergeList(prev, res.changes.projects, res.deletedIds.projects, pd.projects, null));
        setFolders((prev: any) => mergeList(prev, res.changes.folders, res.deletedIds.folders, pd.folders, null));
        setTags((prev: any) => mergeList(prev, res.changes.tags, res.deletedIds.tags, pd.tags, null));
        setAttachments((prev: any) => mergeList(prev, res.changes.attachments || [], res.deletedIds.attachments || [], pd.attachments, null));
        setPomodoroRecords((prev: any) => mergeList(prev, res.changes.pomodoroRecords || [], res.deletedIds.pomodoroRecords || [], pd.pomodoroRecords, null));
        sinceRef.current = res.now;
      } catch {}
    }
    const intervalId = window.setInterval(poll, 25000);
    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);
    let es: EventSource | null = null;
    if (import.meta.env.VITE_ENABLE_SSE === 'true' && typeof EventSource !== 'undefined') {
      try {
        es = new EventSource(`${import.meta.env.VITE_BACKEND_URL || ''}/api/events`);
        es.onmessage = () => { void poll(); };
      } catch { es = null; }
    }
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      if (es) es.close();
    };
  }, [remoteSyncEnabled, setTasks, setProjects, setFolders, setTags, setAttachments, setPomodoroRecords]);
}
