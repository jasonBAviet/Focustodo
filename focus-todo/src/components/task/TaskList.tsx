import React, { useMemo } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import TaskItem from './TaskItem';
import TaskAddBar from './TaskAddBar';

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
  } = useTaskContext();

  const tasks = useMemo(() => getFilteredTasks(), [getFilteredTasks]);

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

  const formatStatTime = (min: number) => {
    if (min === 0) return '0m';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const showAddBar = !['completed', 'events'].includes(activeView);

  return (
    <div className="task-list-container">
      {/* Header */}
      <div className="main-header">
        <h1 className="task-list__title">{viewLabel}</h1>
      </div>

      {/* Stats Row */}
      <div className="main-stats-row">
        <StatCard label="Estimated Time" value={formatStatTime(totalEstimatedMin)} />
        <StatCard label="Tasks to Complete" value={activeCount} />
        <StatCard
          label="Elapsed Time"
          value={totalElapsedMin > 0 ? formatStatTime(totalElapsedMin) : '0m'}
        />
        <StatCard label="Completed Tasks" value={completedCount} color="var(--stat-blue)" />
      </div>

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
            <p>Khong co task nao</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isSelected={task.id === selectedTaskId}
            />
          ))
        )}
      </div>

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
      `}</style>
    </div>
  );
};

export default TaskList;
