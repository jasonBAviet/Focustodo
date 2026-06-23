import React, { useState, useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { dateUtils } from '@/utils/dateUtils';
import TaskFilterBar from '@/features/tasks/components/TaskFilterBar';
import type { Priority } from '@/types';

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};

interface EventsSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  handleDragStart: (e: React.DragEvent, taskId: string) => void;
}

const EventsSidebar: React.FC<EventsSidebarProps> = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  handleDragStart,
}) => {
  const { tasks, projects, filters } = useTaskContext();

  // Chiều rộng mặc định của sidebar
  const [width, setWidth] = useState(340);
  // Bộ lọc của sidebar: 'today' | 'tomorrow' | 'inbox' | 'all'
  const [sidebarFilter, setSidebarFilter] = useState<'today' | 'tomorrow' | 'inbox' | 'all'>('today');

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return '';
    return projects.find((p) => p.id === projectId)?.name || '';
  };

  const getProjectColor = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId)?.color || null;
  };

  // Xử lý sự kiện kéo giãn chiều rộng sidebar
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Vì resizer nằm ở mép trái của sidebar bên phải, việc kéo sang trái (deltaX < 0)
      // sẽ làm tăng chiều rộng của sidebar.
      const newWidth = Math.max(280, Math.min(600, startWidth - deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Lọc danh sách công việc ở sidebar bên phải
  const sidebarTasks = useMemo(() => {
    let result = tasks.filter((task) => {
      if (task.completed) return false;
      if (task.startDate) return false; // Chỉ hiển thị task chưa lên lịch giờ cụ thể

      switch (sidebarFilter) {
        case 'today':
          return !task.dueDate || dateUtils.isToday(task.dueDate);
        case 'tomorrow':
          return dateUtils.isTomorrow(task.dueDate);
        case 'inbox':
          return !task.projectId;
        case 'all':
        default:
          return true;
      }
    });

    // Áp dụng filters từ TaskContext
    if (filters.text) {
      const txt = filters.text.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(txt) || t.note?.toLowerCase().includes(txt));
    }
    if (filters.tagIds.length > 0) {
      const realTagIds = filters.tagIds.filter((id) => id !== '__no_tag__');
      const wantNoTag = filters.tagIds.includes('__no_tag__');
      result = result.filter((t) =>
        (wantNoTag && t.tags.length === 0) ||
        realTagIds.some((tagId) => t.tags.includes(tagId))
      );
    }
    if (filters.projectIds.length > 0) {
      const realProjectIds = filters.projectIds.filter((id) => id !== '__no_project__');
      const wantNoProject = filters.projectIds.includes('__no_project__');
      result = result.filter((t) =>
        (wantNoProject && !t.projectId) ||
        (t.projectId && realProjectIds.includes(t.projectId))
      );
    }
    if (filters.createdFrom) {
      const from = new Date(filters.createdFrom).getTime();
      result = result.filter((t) => new Date(t.createdAt).getTime() >= from);
    }
    if (filters.createdTo) {
      const to = new Date(filters.createdTo).getTime() + 86400000;
      result = result.filter((t) => new Date(t.createdAt).getTime() <= to);
    }
    if (filters.startFrom) {
      const from = new Date(filters.startFrom).getTime();
      result = result.filter((t) => t.startDate && new Date(t.startDate).getTime() >= from);
    }
    if (filters.startTo) {
      const to = new Date(filters.startTo).getTime() + 86400000;
      result = result.filter((t) => t.startDate && new Date(t.startDate).getTime() <= to);
    }
    if (filters.dueFrom) {
      const from = new Date(filters.dueFrom).getTime();
      result = result.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= from);
    }
    if (filters.dueTo) {
      const to = new Date(filters.dueTo).getTime() + 86400000;
      result = result.filter((t) => t.dueDate && new Date(t.dueDate).getTime() <= to);
    }

    return result;
  }, [tasks, sidebarFilter, filters, projects]);

  return (
    <div
      className={`events-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
      style={{ width: sidebarCollapsed ? '0px' : `${width}px` }}
    >
      {/* Resizer Handle ở mép trái */}
      {!sidebarCollapsed && (
        <div className="events-sidebar-resizer" onMouseDown={handleMouseDown} />
      )}

      <div className="events-sidebar-header">
        <div className="events-sidebar-title-wrapper">
          <select
            className="events-sidebar-select"
            value={sidebarFilter}
            onChange={(e) => setSidebarFilter(e.target.value as any)}
          >
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="inbox">Inbox</option>
            <option value="all">All</option>
          </select>
          <button
            className="events-close-sidebar-btn"
            onClick={() => setSidebarCollapsed(true)}
            title="Đóng sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="events-sidebar-filter-container">
        <TaskFilterBar hideStatus={true} isSidebar={true} />
      </div>

      <div className="events-sidebar-list">
        {sidebarTasks.length === 0 ? (
          <div className="events-empty-state">
            <svg className="events-empty-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8" />
            </svg>
            <div className="events-empty-text">No tasks available</div>
          </div>
        ) : (
          sidebarTasks.map((task) => {
            const projName = getProjectName(task.projectId);
            const projColor = getProjectColor(task.projectId);
            return (
              <div
                key={task.id}
                className="events-sidebar-item"
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
              >
                <div className="events-sidebar-item-top">
                  <span className="events-sidebar-item-title">{task.title}</span>
                </div>
                <div className="events-sidebar-item-meta">
                  {projName && (
                    <span
                      className="events-sidebar-item-proj"
                      style={projColor ? { color: projColor } : undefined}
                    >
                      {projColor && <span className="events-sidebar-item-proj-dot" style={{ backgroundColor: projColor }} />}
                      {projName}
                    </span>
                  )}
                  <span className="events-sidebar-item-priority">{PRIORITY_LABELS[task.priority]} priority</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EventsSidebar;
