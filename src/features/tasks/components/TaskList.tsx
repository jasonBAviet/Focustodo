import React, { useMemo, useState } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useAppContext } from '@/core/contexts/AppContext';
import TaskItem from '@/features/tasks/components/TaskItem';
import TaskAddBar from '@/features/tasks/components/TaskAddBar';
import TaskFilterBar from '@/features/tasks/components/TaskFilterBar';
import CalendarView from '@/features/tasks/components/calendar/CalendarView';
import { dateUtils } from '@/utils/dateUtils';
import { useContextMenu } from '@/shared/hooks/useContextMenu';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import TaskContextMenu from '@/features/tasks/components/TaskContextMenu';
import { TaskSortMenu, IconSort } from './TaskSortMenu';
import { TaskStatsRow } from './TaskStats';

const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <circle cx="3" cy="6" r="1"></circle>
    <circle cx="3" cy="12" r="1"></circle>
    <circle cx="3" cy="18" r="1"></circle>
  </svg>
);

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const VIEW_LABELS: Record<string, string> = {
  today: 'Today', tomorrow: 'Tomorrow', 'this-week': 'This Week',
  planned: 'Planned', events: 'Events', completed: 'Completed',
  all: 'All Tasks', someday: 'Someday',
  'high-priority': 'High Priority', 'medium-priority': 'Medium Priority', 'low-priority': 'Low Priority',
  project: '', tag: '', folder: '', unassigned: 'Uncategorized',
};

type SortOption = 'project' | 'createdAt' | 'dueDate' | 'priority' | null;
type SortDirection = 'asc' | 'desc';



const TaskList: React.FC = () => {
  const { viewMode, setViewMode } = useAppContext();
  const {
    getFilteredTasks,
    selectedTaskId,
    activeView,
    activeProjectId,
    activeTagId,
    activeFolderId,
    projects,
    folders,
    tags,
    tasks: allTasks,
    deleteTask,
    reorderTasks,
  } = useTaskContext();

  const filteredTasks = useMemo(() => getFilteredTasks(), [getFilteredTasks]);
  // Mobile: compact stat labels.
  const isMobile = useIsMobile();
  const [confirmClear, setConfirmClear] = useState(false);
  const contextMenu = useContextMenu<string>();
  const sortMenu = useContextMenu<null>();
  const [sortBy, setSortBy] = useState<SortOption>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  // Drag to reorder: only enabled in project view when manual sort is not applied.
  const [dragId, setDragId] = useState<string | null>(null);



  const tasks = useMemo(() => {
    let result = [...filteredTasks];
    if (sortBy === 'project') {
      result.sort((a, b) => {
        const nameA = projects.find((p) => p.id === a.projectId)?.name || '';
        const nameB = projects.find((p) => p.id === b.projectId)?.name || '';
        const cmp = nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (sortBy === 'createdAt') {
      result.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      });
    } else if (sortBy === 'dueDate') {
      result.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const timeA = new Date(a.dueDate).getTime();
        const timeB = new Date(b.dueDate).getTime();
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      });
    } else if (sortBy === 'priority') {
      const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 };
      result.sort((a, b) => {
        const weightA = priorityWeight[a.priority];
        const weightB = priorityWeight[b.priority];
        return sortDirection === 'asc' ? weightA - weightB : weightB - weightA;
      });
    } else if (activeView === 'project') {
      // Default in project view: by position (drag & drop order).
      result.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    return result;
  }, [filteredTasks, sortBy, sortDirection, activeView, projects]);

  // Drag & drop: only in project view and when manual sort is not applied.
  const canReorder = activeView === 'project' && sortBy === null;

  const handleDrop = (overId: string) => {
    if (!dragId || dragId === overId) {
      setDragId(null);
      return;
    }
    const ids = tasks.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(overId);
    setDragId(null);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderTasks(ids);
  };

  const viewLabel = useMemo(() => {
    if (activeView === 'project' && activeProjectId) {
      return projects.find((p) => p.id === activeProjectId)?.name || 'Project';
    }
    if (activeView === 'tag' && activeTagId) {
      const tag = tags.find((t) => t.id === activeTagId);
      return tag ? `# ${tag.name}` : 'Tag';
    }
    if (activeView === 'folder' && activeFolderId) {
      const folder = folders.find((f) => f.id === activeFolderId);
      return folder ? folder.name : 'Folder';
    }
    return VIEW_LABELS[activeView] || activeView;
  }, [activeView, activeProjectId, activeTagId, activeFolderId, projects, tags, folders]);

  // Stats
  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = tasks.filter((t) => !t.completed).length;
  const totalEstimatedMin = tasks.reduce((sum, t) => sum + t.pomodoroEstimate * 25, 0);
  const totalElapsedMin = tasks.reduce((sum, t) => sum + t.totalFocusTime, 0);

  // Stats for completed view
  const { todayCompleted, weekCompleted, totalCompleted, totalFocusAll } = useMemo(() => ({
    todayCompleted: allTasks.filter((t) => t.completed && dateUtils.isToday(t.completedAt)).length,
    weekCompleted: allTasks.filter((t) => t.completed && dateUtils.isThisWeek(t.completedAt)).length,
    totalCompleted: allTasks.filter((t) => t.completed).length,
    totalFocusAll: allTasks.reduce((sum, t) => sum + t.totalFocusTime, 0),
  }), [allTasks]);



  const handleClearCompleted = () => {
    const completedIds = tasks.filter((t) => t.completed).map((t) => t.id);
    completedIds.forEach((id) => deleteTask(id));
    setConfirmClear(false);
  };

  const showAddBar = !['completed', 'events'].includes(activeView);
  const isCompletedView = activeView === 'completed';

  return (
    <div className="task-list-container">
      {/* Header */}
      <div className="main-header">
        <h1 className="task-list__title">{viewLabel}</h1>
        <div className="main-header-actions">
          {/* View mode selector */}
          <div className="view-mode-selector" style={{ display: 'flex', gap: 4, marginRight: 8, background: 'var(--bg-input, rgba(0,0,0,0.05))', borderRadius: 'var(--radius-md)', padding: 2, border: '1px solid var(--border)' }}>
            <button
              className={`view-mode-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
              style={{
                background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              <IconList />
            </button>
            <button
              className={`view-mode-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
              title="Calendar view"
              style={{
                background: viewMode === 'calendar' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                color: viewMode === 'calendar' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              <IconCalendar />
            </button>
          </div>

          {!isCompletedView && viewMode === 'list' && (
            <button className="sort-btn" onClick={(e) => sortMenu.open(e, null)} title={sortBy ? `Sort: ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}` : "Sort"}>
              <IconSort direction={sortBy ? sortDirection : undefined} />
            </button>
          )}
          {isCompletedView && tasks.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!confirmClear ? (
              <button
                className="clear-completed-btn"
                onClick={() => setConfirmClear(true)}
              >
                Clear All
              </button>
            ) : (
              <>
                <span className="clear-completed-confirm">Delete {tasks.length} tasks?</span>
                <button className="clear-completed-btn danger" onClick={handleClearCompleted}>Delete</button>
                <button className="clear-completed-btn" onClick={() => setConfirmClear(false)}>Cancel</button>
              </>
            )}
          </div>
          )}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView />
      ) : (
        <>
          <TaskStatsRow
            isCompletedView={isCompletedView}
            isMobile={isMobile}
            todayCompleted={todayCompleted}
            weekCompleted={weekCompleted}
            totalCompleted={totalCompleted}
            totalFocusAll={totalFocusAll}
            totalEstimatedMin={totalEstimatedMin}
            activeCount={activeCount}
            totalElapsedMin={totalElapsedMin}
            completedCount={completedCount}
          />

          {/* Task Add Bar */}
          {showAddBar && (
            <div style={{ marginBottom: 8 }}>
              <TaskAddBar />
            </div>
          )}

          {/* Filter Bar */}
          <TaskFilterBar />

          {/* Task Items */}
          <div className={`main-task-area stagger-children${activeView === 'planned' ? ' planned-view' : ''}`}>
            {tasks.length === 0 ? (
              <div className="task-list__empty">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="var(--border-strong)" strokeWidth="2"/>
                  <path d="M16 24h16M24 16v16" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>No tasks</p>
              </div>
            ) : (
              tasks.map((task) =>
                canReorder ? (
                  <div
                    key={task.id}
                    className={`task-drag-row${dragId === task.id ? ' dragging' : ''}`}
                    draggable
                    onDragStart={() => setDragId(task.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleDrop(task.id); }}
                    onDragEnd={() => setDragId(null)}
                  >
                    <TaskItem
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onContextMenu={(e) => contextMenu.open(e, task.id)}
                    />
                  </div>
                ) : (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isSelected={task.id === selectedTaskId}
                    onContextMenu={(e) => contextMenu.open(e, task.id)}
                  />
                ),
              )
            )}
          </div>
        </>
      )}

      <TaskContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={contextMenu.close}
        taskId={contextMenu.data}
      />

      <TaskSortMenu
        sortMenu={sortMenu}
        sortBy={sortBy}
        sortDirection={sortDirection}
        setSortBy={setSortBy}
        setSortDirection={setSortDirection}
      />

      <style>{`
        .task-list-container { display: flex; flex-direction: column; height: 100%; }
        .main-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
        .main-header-actions { display: flex; gap: var(--space-2); align-items: center; }
        .task-list__title {
          font-size: var(--text-2xl);
          font-weight: 600;
          color: var(--text-primary);
        }
        .task-list__empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: var(--space-3); padding: 60px 0;
          color: var(--text-tertiary); font-size: var(--text-sm);
        }
        .clear-completed-btn {
          padding: 4px 12px; border-radius: var(--radius-full);
          border: 1px solid var(--border); background: transparent;
          color: var(--text-secondary); font-size: var(--text-xs);
          cursor: pointer; font-family: var(--font-main);
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .clear-completed-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .clear-completed-btn.danger { border-color: var(--priority-high); color: var(--priority-high); }
        .clear-completed-btn.danger:hover { background: var(--priority-high); color: #fff; }
        .clear-completed-confirm { font-size: var(--text-xs); color: var(--text-tertiary); display: flex; align-items: center; }
        .sort-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-1-5);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        .sort-btn:hover {
          color: var(--text-primary);
          background: var(--bg-card-hover);
          border-color: var(--border-strong);
        }
        .cm-divider { height: 1px; background: var(--border); margin: 4px 0; }

        /* Drag-and-drop to reorder tasks in project view */
        .task-drag-row { cursor: grab; flex-shrink: 0; }
        .task-drag-row.dragging { opacity: 0.45; cursor: grabbing; }

        /* Planned view: dùng gap lớn hơn một chút */
        .planned-view {
          gap: var(--space-2);
        }
      `}</style>
    </div>
  );
};

export default TaskList;
