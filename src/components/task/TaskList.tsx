import React, { useMemo, useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import TaskItem from './TaskItem';
import TaskAddBar from './TaskAddBar';
import TaskFilterBar from './TaskFilterBar';
import { dateUtils } from '../../utils/dateUtils';
import { useContextMenu } from '../../hooks/useContextMenu';
import { useInjectedStyle } from '../../hooks/useInjectedStyle';
import TaskContextMenu from './TaskContextMenu';
import ContextMenu from '../common/ContextMenu';

const STAT_CARD_CSS = `
      .stat-card { display: flex; flex-direction: column; gap: 2px; }
      .stat-card__value { font-size: var(--text-2xl); font-weight: 700; line-height: 1; }
      .stat-card__label { font-size: var(--text-xs); color: var(--text-tertiary); }
`;

type SortOption = 'project' | 'dueDate' | 'priority' | null;
type SortDirection = 'asc' | 'desc';

const IconSort = ({ direction }: { direction?: SortDirection }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {direction === 'asc' ? (
      <path d="M8 16l-2-2h2V4M16 4v10h2l-2 2M4 20h16"/>
    ) : direction === 'desc' ? (
      <path d="M8 4l-2 2h2v10M16 20v-10h2l-2-2M4 4h16"/>
    ) : (
      <path d="M8 8l-2 2h2v10M16 4v16M12 16l4 4 4-4"/>
    )}
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--stat-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const VIEW_LABELS: Record<string, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  'this-week': 'This Week',
  planned: 'Planned',
  events: 'Events',
  completed: 'Completed',
  all: 'All Tasks',
  someday: 'Someday',
  'high-priority': 'High Priority',
  'medium-priority': 'Medium Priority',
  'low-priority': 'Low Priority',
  project: '',
  tag: '',
  folder: '',
};

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({
  label, value, color,
}) => {
  useInjectedStyle('stat-card', STAT_CARD_CSS);
  return (
    <div className="stat-card">
      <span className="stat-card__value" style={{ color: color || 'var(--stat-red)' }}>
        {value}
      </span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
};

const TaskList: React.FC = () => {
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
  const [confirmClear, setConfirmClear] = useState(false);
  const contextMenu = useContextMenu<string>();
  const sortMenu = useContextMenu<null>();
  const [sortBy, setSortBy] = useState<SortOption>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  // Kéo-thả sắp xếp: chỉ bật trong project view khi không áp sort thủ công.
  const [dragId, setDragId] = useState<string | null>(null);

  const handleSortClick = (field: SortOption) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
    sortMenu.close();
  };

  const tasks = useMemo(() => {
    let result = [...filteredTasks];
    if (sortBy === 'project') {
      result.sort((a, b) => (a.projectId || '').localeCompare(b.projectId || ''));
    } else if (sortBy === 'dueDate') {
      result.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortBy === 'priority') {
      const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 };
      result.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
    } else if (activeView === 'project') {
      // Mặc định trong project view: theo position (thứ tự kéo-thả).
      result.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    if (sortBy && sortDirection === 'desc') {
      result.reverse();
    }
    return result;
  }, [filteredTasks, sortBy, sortDirection, activeView]);

  // Kéo-thả: chỉ trong project view và khi chưa áp sort thủ công.
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

  const formatStatTime = (min: number) => {
    if (min === 0) return '0m';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

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
          {!isCompletedView && (
            <button className="sort-btn" onClick={(e) => sortMenu.open(e, null)} title={sortBy ? `Sort: ${sortDirection.toUpperCase()}` : "Sort"}>
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
                <span className="clear-completed-confirm">Xóa {tasks.length} task?</span>
                <button className="clear-completed-btn danger" onClick={handleClearCompleted}>Xóa</button>
                <button className="clear-completed-btn" onClick={() => setConfirmClear(false)}>Hủy</button>
              </>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {isCompletedView ? (
        <div className="main-stats-row">
          <StatCard label="Completed Today" value={todayCompleted} color="var(--stat-blue)" />
          <StatCard label="Completed This Week" value={weekCompleted} color="var(--stat-blue)" />
          <StatCard label="Total Completed" value={totalCompleted} color="var(--stat-blue)" />
          <StatCard label="Total Focus Time" value={formatStatTime(totalFocusAll)} />
        </div>
      ) : (
        <div className="main-stats-row">
          <StatCard label="Estimated Time" value={formatStatTime(totalEstimatedMin)} />
          <StatCard label="Tasks to Complete" value={activeCount} />
          <StatCard
            label="Elapsed Time"
            value={totalElapsedMin > 0 ? formatStatTime(totalElapsedMin) : '0m'}
          />
          <StatCard label="Completed Tasks" value={completedCount} color="var(--stat-blue)" />
        </div>
      )}

      {/* Task Add Bar */}
      {showAddBar && (
        <div style={{ marginBottom: 8 }}>
          <TaskAddBar />
        </div>
      )}

      {/* Filter Bar - lọc theo tag/project/text/ngày tạo/ngày due */}
      <TaskFilterBar />

      {/* Task Items */}
      <div className={`main-task-area stagger-children${activeView === 'planned' ? ' planned-view' : ''}`}>
        {tasks.length === 0 ? (
          <div className="task-list__empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="var(--border-strong)" strokeWidth="2"/>
              <path d="M16 24h16M24 16v16" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>Khong co task nao</p>
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

      <TaskContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={contextMenu.close}
        taskId={contextMenu.data}
      />

      <ContextMenu
        x={sortMenu.x}
        y={sortMenu.y}
        isOpen={sortMenu.isOpen}
        onClose={sortMenu.close}
      >
        <div className="cm-menu" style={{ width: 200 }}>
          <div className="cm-item" onClick={() => handleSortClick('project')}>
            <span className="cm-item-text">Sort by project {sortBy === 'project' && `(${sortDirection.toUpperCase()})`}</span>
            {sortBy === 'project' && <IconCheck />}
          </div>
          <div className="cm-item" onClick={() => handleSortClick('dueDate')}>
            <span className="cm-item-text">Sort by due date {sortBy === 'dueDate' && `(${sortDirection.toUpperCase()})`}</span>
            {sortBy === 'dueDate' && <IconCheck />}
          </div>
          <div className="cm-item" onClick={() => handleSortClick('priority')}>
            <span className="cm-item-text">Sort by task priority {sortBy === 'priority' && `(${sortDirection.toUpperCase()})`}</span>
            {sortBy === 'priority' && <IconCheck />}
          </div>
          {sortBy && (
            <>
              <div className="cm-divider"></div>
              <div className="cm-item" onClick={() => { setSortBy(null); setSortDirection('asc'); sortMenu.close(); }}>
                <span className="cm-item-text">Clear sort</span>
              </div>
            </>
          )}
        </div>
      </ContextMenu>

      <style>{`
        .task-list-container { display: flex; flex-direction: column; height: 100%; }
        .main-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .main-header-actions { display: flex; gap: 8px; align-items: center; }
        .task-list__title {
          font-size: var(--text-2xl);
          font-weight: 600;
          color: var(--text-primary);
        }
        .task-list__empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; padding: 60px 0;
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
          padding: 6px;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }
        .sort-btn:hover {
          color: var(--text-primary);
          background: var(--bg-card-hover);
          border-color: var(--border-strong);
        }
        .cm-divider { height: 1px; background: var(--border); margin: 4px 0; }

        /* Kéo-thả sắp xếp task trong project view */
        .task-drag-row { cursor: grab; }
        .task-drag-row.dragging { opacity: 0.45; cursor: grabbing; }

        /* Planned view: card container cho moi task item */
        .planned-view {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .planned-view .task-item {
          border-bottom: none;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 14px;
          background: var(--bg-card, var(--task-bg));
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
        }
        .planned-view .task-item:hover {
          border-color: var(--border-strong);
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
          background: var(--task-bg-hover);
        }
        .planned-view .task-item.selected {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent);
          background: var(--task-bg-selected);
        }
      `}</style>
    </div>
  );
};

export default TaskList;
