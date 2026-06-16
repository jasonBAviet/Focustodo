import React, { useState } from 'react';
import type { Task } from '@/types';
import { calendarUtils } from '@/features/tasks/components/calendar/calendarUtils';
import { useTaskContext } from '@/features/tasks/TaskContext';

interface CalendarDayProps {
  currentDate: Date;
  tasks: Task[];
  onSelectTask: (id: string) => void;
  selectedTaskId: string | null;
  dateField: 'dueDate' | 'createdAt';
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  currentDate,
  tasks,
  onSelectTask,
  selectedTaskId,
  dateField,
}) => {
  const { addTask, updateTask, getProjectName } = useTaskContext();
  const [isDragOver, setIsDragOver] = useState(false);

  const dayTasks = tasks.filter((t) => {
    const rawDate = t[dateField];
    if (dateField === 'dueDate') {
      const startStr = t.startDate ? calendarUtils.toDateString(new Date(t.startDate)) : null;
      const dueStr = rawDate ? calendarUtils.toDateString(new Date(rawDate)) : null;
      const currentDateStr = calendarUtils.toDateString(currentDate);
      if (startStr && dueStr) {
        return currentDateStr >= startStr && currentDateStr <= dueStr;
      } else if (dueStr) {
        return currentDateStr === dueStr;
      } else if (startStr) {
        return currentDateStr === startStr;
      }
      return false;
    }
    if (!rawDate) return false;
    const d = new Date(rawDate);
    return calendarUtils.isSameDay(d, currentDate);
  });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const targetDate = new Date(currentDate);
      targetDate.setHours(9, 0, 0, 0);
      updateTask(taskId, { dueDate: targetDate.toISOString() });
    }
  };

  const handleDoubleClick = () => {
    const title = window.prompt('Enter new task title:');
    if (title && title.trim()) {
      const targetDate = new Date(currentDate);
      targetDate.setHours(9, 0, 0, 0);
      const newTask = addTask(title.trim(), null, 'none', 1);
      updateTask(newTask.id, { dueDate: targetDate.toISOString() });
    }
  };

  return (
    <div
      className={`calendar-day-container ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDoubleClick={handleDoubleClick}
    >
      <div className="cal-day-header">
        <h2>Details for {currentDate.getMonth() + 1}/{currentDate.getDate()}</h2>
        <span className="cal-day-hint">
          {dateField === 'createdAt' ? 'Shown by creation date' : 'Double click on empty space to quickly create a new task'}
        </span>
      </div>

      <div className="cal-day-content">
        {dayTasks.length === 0 ? (
          <div className="cal-day-empty">
            No tasks scheduled for this day.
          </div>
        ) : (
          <div className="cal-day-task-list">
            {dayTasks.map((task) => (
              <div
                key={task.id}
                className={`cal-day-task-card priority-${task.priority} ${task.completed ? 'completed' : ''} ${task.id === selectedTaskId ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTask(task.id);
                }}
              >
                <div className="cal-day-card-left">
                  <div className="cal-day-task-title">{task.title}</div>
                  {task.note && <div className="cal-day-task-note">{task.note}</div>}
                </div>
                
                <div className="cal-day-card-right">
                  {task.projectId && (
                    <span className="cal-day-project-tag">
                      {getProjectName(task.projectId)}
                    </span>
                  )}
                  {task.pomodoroEstimate > 0 && (
                    <span className="cal-day-pomos">
                      {task.pomodoroCompleted}/{task.pomodoroEstimate} 🍅
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .calendar-day-container {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          flex: 1;
          min-height: 480px;
          transition: all var(--transition-fast);
          user-select: none;
        }
        .calendar-day-container.drag-over {
          background: color-mix(in srgb, var(--accent) 5%, transparent);
          border-color: var(--accent);
          border-style: dashed;
        }
        .cal-day-header {
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }
        .cal-day-header h2 {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }
        .cal-day-hint {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .cal-day-content {
          flex: 1;
          overflow-y: auto;
        }
        .cal-day-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--text-tertiary);
          font-size: var(--text-sm);
        }
        .cal-day-task-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cal-day-task-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-radius: 10px;
          background: var(--bg-input, rgba(0, 0, 0, 0.02));
          border: 1px solid var(--border);
          cursor: grab;
          transition: all var(--transition-fast);
        }
        .cal-day-task-card:hover {
          border-color: var(--border-strong);
          background: var(--bg-card-hover);
        }
        .cal-day-task-card.selected {
          border-color: var(--accent);
          background: var(--task-bg-selected);
          box-shadow: 0 0 0 1px var(--accent);
        }
        .cal-day-task-card.completed {
          opacity: 0.55;
        }
        .cal-day-task-card.completed .cal-day-task-title {
          text-decoration: line-through;
        }
        .cal-day-task-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .cal-day-task-note {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          max-width: 400px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cal-day-card-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cal-day-project-tag {
          font-size: var(--text-xs);
          background: var(--bg-input, rgba(0, 0, 0, 0.05));
          color: var(--text-secondary);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .cal-day-pomos {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }
        .cal-day-task-card.priority-high {
          border-left: 4px solid var(--priority-high, #ff4d4f);
          background: color-mix(in srgb, var(--priority-high, #ff4d4f) 6%, var(--bg-card));
        }
        .cal-day-task-card.priority-medium {
          border-left: 4px solid var(--priority-medium, #ffa940);
          background: color-mix(in srgb, var(--priority-medium, #ffa940) 6%, var(--bg-card));
        }
        .cal-day-task-card.priority-low {
          border-left: 4px solid var(--priority-low, #52c41a);
          background: color-mix(in srgb, var(--priority-low, #52c41a) 6%, var(--bg-card));
        }
      `}</style>
    </div>
  );
};

export default CalendarDay;
