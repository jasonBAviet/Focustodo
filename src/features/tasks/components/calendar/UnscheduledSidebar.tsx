import React from 'react';
import type { Task } from '@/types';
import { useTaskContext } from '@/features/tasks/TaskContext';

interface UnscheduledSidebarProps {
  tasks: Task[];
  onSelectTask: (id: string) => void;
  selectedTaskId: string | null;
}

const UnscheduledSidebar: React.FC<UnscheduledSidebarProps> = ({
  tasks,
  onSelectTask,
  selectedTaskId,
}) => {
  const { getProjectName } = useTaskContext();
  const unscheduled = tasks.filter((t) => !t.dueDate && !t.completed);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="unscheduled-sidebar">
      <h3 className="unscheduled-title">Unscheduled Tasks</h3>
      <div className="unscheduled-list">
        {unscheduled.length === 0 ? (
          <div className="unscheduled-empty">
            All tasks are scheduled.
          </div>
        ) : (
          unscheduled.map((task) => (
            <div
              key={task.id}
              className={`unscheduled-item priority-${task.priority} ${task.id === selectedTaskId ? 'selected' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onClick={() => onSelectTask(task.id)}
            >
              <div className="unsched-title-text">{task.title}</div>
              <div className="unsched-meta">
                {task.projectId && (
                  <span className="unsched-project-tag">
                    {getProjectName(task.projectId)}
                  </span>
                )}
                {task.pomodoroEstimate > 0 && (
                  <span className="unsched-pomo-tag">
                    {task.pomodoroEstimate} 🍅
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .unscheduled-sidebar {
          display: flex;
          flex-direction: column;
          width: 250px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          height: 100%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(8px);
        }
        .unscheduled-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }
        .unscheduled-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
        }
        .unscheduled-empty {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-align: center;
          padding: 24px 0;
        }
        .unscheduled-item {
          padding: 10px;
          border-radius: 8px;
          background: var(--bg-input, rgba(0,0,0,0.02));
          border: 1px solid var(--border);
          cursor: grab;
          transition: all var(--transition-fast);
        }
        .unscheduled-item:hover {
          border-color: var(--border-strong);
          background: var(--bg-card-hover);
          transform: translateY(-1px);
        }
        .unscheduled-item.selected {
          border-color: var(--accent);
          background: var(--task-bg-selected);
        }
        .unscheduled-item.priority-high {
          border-left: 3px solid var(--priority-high, #ff4d4f);
        }
        .unscheduled-item.priority-medium {
          border-left: 3px solid var(--priority-medium, #ffa940);
        }
        .unscheduled-item.priority-low {
          border-left: 3px solid var(--priority-low, #52c41a);
        }
        .unsched-title-text {
          font-size: var(--text-xs);
          color: var(--text-primary);
          font-weight: 500;
          line-height: 1.4;
          margin-bottom: 4px;
          word-break: break-word;
        }
        .unsched-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .unsched-project-tag {
          font-size: 9px;
          background: var(--bg-input, rgba(0, 0, 0, 0.05));
          color: var(--text-secondary);
          padding: 1px 4px;
          border-radius: 4px;
        }
        .unsched-pomo-tag {
          font-size: 9px;
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};

export default UnscheduledSidebar;
