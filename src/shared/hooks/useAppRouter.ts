import { useEffect, useRef } from 'react';
import type { ViewType } from '@/types';

interface UseAppRouterProps {
  activeView: ViewType;
  activeProjectId: string | null;
  showReport: boolean;
  setActiveView: (view: ViewType) => void;
  setActiveProjectId: (id: string | null) => void;
  setShowReport: (v: boolean) => void;
}

export function useAppRouter({
  activeView,
  activeProjectId,
  showReport,
  setActiveView,
  setActiveProjectId,
  setShowReport,
}: UseAppRouterProps) {
  // Keep setters in ref so popstate effect has deps [] (don't re-run
  // when setter identity changes) -> avoid continuous re-run causing loop.
  const settersRef = useRef({ setActiveView, setActiveProjectId, setShowReport });
  settersRef.current = { setActiveView, setActiveProjectId, setShowReport };

  // 1. URL -> State: run once on mount (deep link) + listen to back/forward.
  useEffect(() => {
    const applyPathToState = () => {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      const setters = settersRef.current;

      // At root '/', keep state from DB/localStorage.
      if (path === '/') return;

      if (path === '/report') {
        setters.setShowReport(true);
        return;
      }

      setters.setShowReport(false);
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

  // 2. State -> URL: push URL when state changes (sidebar click...).
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

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    if (currentPath !== targetPath) {
      if (currentPath === '/' && targetPath === '/today') {
        window.history.replaceState(null, '', targetPath);
      } else {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, [activeView, activeProjectId, showReport]);
}
