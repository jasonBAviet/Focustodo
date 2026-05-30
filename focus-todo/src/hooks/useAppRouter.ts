import { useEffect } from 'react';
import type { ViewType } from '../types';

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
  
  // 1. Đồng bộ từ URL vào State (khi popstate hoặc load lần đầu)
  useEffect(() => {
    const handlePopState = (isInitial = false) => {
      const path = window.location.pathname;
      
      // Nếu là lần đầu load và ở root path '/', ta ưu tiên giữ trạng thái từ LocalStorage
      if (isInitial && path === '/') {
        return;
      }

      if (path === '/report') {
        setShowReport(true);
      } else {
        setShowReport(false);
        if (path.startsWith('/project/')) {
          const pid = path.replace('/project/', '');
          setActiveView('project');
          setActiveProjectId(pid);
        } else {
          const view = path.replace('/', '') || 'today';
          // Ép kiểu về ViewType, các view hợp lệ: today, tomorrow, this-week, planned, events, completed, etc.
          setActiveView(view as ViewType);
          setActiveProjectId(null);
        }
      }
    };

    // Gọi lần đầu để xử lý initial load (deep link)
    handlePopState(true);

    const onPopState = () => handlePopState(false);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setActiveView, setActiveProjectId, setShowReport]);

  // 2. Đồng bộ từ State ra URL (khi user click vào sidebar làm state thay đổi)
  useEffect(() => {
    let targetPath = '/today';
    if (showReport) {
      targetPath = '/report';
    } else if (activeView === 'project' && activeProjectId) {
      targetPath = `/project/${activeProjectId}`;
    } else {
      targetPath = `/${activeView}`;
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeView, activeProjectId, showReport]);
}
