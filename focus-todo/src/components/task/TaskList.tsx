import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import TaskItem from './TaskItem';
import TaskAddBar from './TaskAddBar';
import { dateUtils } from '../../utils/dateUtils';
import { useContextMenu } from '../../hooks/useContextMenu';
import TaskContextMenu from './TaskContextMenu';
import ContextMenu from '../common/ContextMenu';

type SortOption = 'project' | 'dueDate' | 'priority' | null;

const IconSort = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 8l-2 2h2v10M16 4v16M12 16l4 4 4-4"></path>
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
};

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({
  label, value, color,
}) => (
  <div className="stat-card">
    <span className="stat-card__value" style={{ color: color || 'var(--stat-red)' }}>
      {value}
    </span>
    <span className="stat-card__label">{label}</span>
    <style>{`
      .stat-card { display: flex; flex-direction: column; gap: 2px; }
      .stat-card__value { font-size: var(--text-2xl); font-weight: 700; line-height: 1; }
      .stat-card__label { font-size: var(--text-xs); color: var(--text-tertiary); }
    `}</style>
  </div>
);

const TaskList: React.FC = () => {
  const {
    getFilteredTasks,
    selectedTaskId,
    activeView,
    activeProjectId,
    projects,
    tasks: allTasks,
    deleteTask,
  } = useTaskContext();

  const filteredTasks = useMemo(() => getFilteredTasks(), [getFilteredTasks]);
  const [confirmClear, setConfirmClear] = useState(false);
  const contextMenu = useContextMenu<string>();
  const sortMenu = useContextMenu<null>();
  const [sortBy, setSortBy] = useState<SortOption>(null);

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
    }
    return result;
  }, [filteredTasks, sortBy]);

  const [visibleCount, setVisibleCount] = useState(20);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(20);
  }, [tasks]);

  const visibleTasks = tasks.slice(0, visibleCount);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, tasks.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [tasks.length]);

  const viewLabel = useMemo(() => {
    if (activeView === 'project' && activeProjectId) {
      return projects.find((p) => p.id === activeProjectId)?.name || 'Project';
    }
    return VIEW_LABELS[activeView] || activeView;
  }, [activeView, activeProjectId, projects]);

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isCompletedView && (
            <button className="sort-btn" onClick={(e) => sortMenu.open(e, null)} title="Sort">
              <IconSort />
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

      {/* Task Items */}
      <div className="main-task-area stagger-children">
        {tasks.length === 0 ? (
          <div className="task-list__empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="var(--border-strong)" strokeWidth="2"/>
              <path d="M16 24h16M24 16v16" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>No tasks available</p>
          </div>
        ) : (
          <>
            {visibleTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={task.id === selectedTaskId}
                onContextMenu={(e) => contextMenu.open(e, task.id)}
              />
            ))}
            {visibleCount < tasks.length && (
              <div ref={observerTarget} style={{ height: '20px', width: '100%' }} />
            )}
          </>
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
        <div className="cm-menu" style={{ width: 180 }}>
          <div className="cm-item" onClick={() => { setSortBy('project'); sortMenu.close(); }}>
            <span className="cm-item-text">Sort by project</span>
            {sortBy === 'project' && <IconCheck />}
          </div>
          <div className="cm-item" onClick={() => { setSortBy('dueDate'); sortMenu.close(); }}>
            <span className="cm-item-text">Sort by due date</span>
            {sortBy === 'dueDate' && <IconCheck />}
          </div>
          <div className="cm-item" onClick={() => { setSortBy('priority'); sortMenu.close(); }}>
            <span className="cm-item-text">Sort by task priority</span>
            {sortBy === 'priority' && <IconCheck />}
          </div>
        </div>
      </ContextMenu>

      <style>{`
        .task-list-container { display: flex; flex-direction: column; height: 100%; }
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
      `}</style>
    </div>
  );
};

export default TaskList;
