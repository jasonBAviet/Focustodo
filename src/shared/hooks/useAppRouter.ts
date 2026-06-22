import { useEffect, useRef } from 'react';
import type { ViewType } from '@/types';

interface UseAppRouterProps {
  activeView: ViewType;
  activeProjectId: string | null;
  showReport: boolean;
  viewMode: 'list' | 'calendar' | 'kg' | 'gantt';
  setActiveView: (view: ViewType) => void;
  setActiveProjectId: (id: string | null) => void;
  setShowReport: (v: boolean) => void;
  setViewMode: (mode: 'list' | 'calendar' | 'kg' | 'gantt') => void;
}

export function useAppRouter({
  activeView,
  activeProjectId,
  showReport,
  viewMode,
  setActiveView,
  setActiveProjectId,
  setShowReport,
  setViewMode,
}: UseAppRouterProps) {
  // Keep setters in ref so popstate effect has deps []
  const settersRef = useRef({ setActiveView, setActiveProjectId, setShowReport, setViewMode });
  settersRef.current = { setActiveView, setActiveProjectId, setShowReport, setViewMode };

  // 1. URL -> State: run once on mount (deep link) + listen to back/forward.
  useEffect(() => {
    const applyPathToState = () => {
      let path = window.location.pathname.replace(/\/$/, '') || '/';
      const setters = settersRef.current;

      // At root '/', keep state from DB/localStorage.
      if (path === '/') return;

      if (path === '/report') {
        setters.setShowReport(true);
        return;
      }

      setters.setShowReport(false);

      // Determine viewMode from suffix
      let mode: 'list' | 'calendar' | 'kg' | 'gantt' = 'list';
      if (path.endsWith('/calendar')) {
        mode = 'calendar';
        path = path.slice(0, -9); // remove '/calendar'
      } else if (path.endsWith('/kg')) {
        mode = 'kg';
        path = path.slice(0, -3); // remove '/kg'
      } else if (path.endsWith('/gantt')) {
        mode = 'gantt';
        path = path.slice(0, -6); // remove '/gantt'
      }
      setters.setViewMode(mode);

      if (path.startsWith('/project/')) {
        const pid = path.replace('/project/', '');
        setters.setActiveView('project');
        setters.setActiveProjectId(pid);
      } else {
        const view = (path.replace('/', '') || 'today') as ViewType;
        setters.setActiveView(view);
        setters.setActiveProjectId(null);
      }
    };

    applyPathToState(); // deep-link on first load
    window.addEventListener('popstate', applyPathToState);
    return () => window.removeEventListener('popstate', applyPathToState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isInitialMount = useRef(true);

  // 2. State -> URL: push URL when state changes (sidebar click, view mode change...).
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let targetPath = '/today';
    if (showReport) {
      targetPath = '/report';
    } else if (activeView === 'project' && activeProjectId) {
      targetPath = `/project/${activeProjectId}`;
    } else {
      targetPath = `/${activeView}`;
    }

    // Add view mode suffix if not list
    if (viewMode === 'calendar') {
      targetPath += '/calendar';
    } else if (viewMode === 'kg') {
      targetPath += '/kg';
    } else if (viewMode === 'gantt') {
      targetPath += '/gantt';
    }

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    if (currentPath !== targetPath) {
      if (currentPath === '/' && targetPath === '/today') {
        window.history.replaceState(null, '', targetPath);
      } else {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, [activeView, activeProjectId, showReport, viewMode]);
}
