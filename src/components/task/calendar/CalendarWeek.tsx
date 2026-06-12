import React, { useState } from 'react';
import type { Task } from '../../../types';
import { calendarUtils } from './calendarUtils';
import { useTaskContext } from '../../../contexts/TaskContext';

interface CalendarWeekProps {
  currentDate: Date;
  tasks: Task[];
  onSelectTask: (id: string) => void;
  selectedTaskId: string | null;
}

const WEEK_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const CalendarWeek: React.FC<CalendarWeekProps> = ({
  currentDate,
  tasks,
  onSelectTask,
  selectedTaskId,
}) => {
  const { addTask, updateTask, getProjectName } = useTaskContext();
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const weekDays = calendarUtils.getWeekDays(currentDate);

  const getTasksForDate = (dateString: string) => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      const cellD = new Date(dateString);
      return calendarUtils.isSameDay(d, cellD);
    });
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateString: string) => {
    e.preventDefault();
    if (dragOverDate !== dateString) {
      setDragOverDate(dateString);
    }
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, dateString: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const targetDate = new Date(dateString);
      targetDate.setHours(9, 0, 0, 0);
      updateTask(taskId, { dueDate: targetDate.toISOString() });
    }
  };

  const handleDoubleClick = (dateString: string) => {
    const title = window.prompt('Nhập tiêu đề công việc mới:');
    if (title && title.trim()) {
      const targetDate = new Date(dateString);
      targetDate.setHours(9, 0, 0, 0);
      const newTask = addTask(title.trim(), null, 'none', 1);
      updateTask(newTask.id, { dueDate: targetDate.toISOString() });
    }
  };

  return (
    <div className="calendar-week-grid">
      {weekDays.map((day, index) => {
        const dayTasks = getTasksForDate(day.dateString);
        const isDragOver = dragOverDate === day.dateString;

        return (
          <div
            key={day.dateString}
            className={`calendar-week-col ${day.isToday ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, day.dateString)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, day.dateString)}
            onDoubleClick={() => handleDoubleClick(day.dateString)}
          >
            <div className="calendar-week-col-header">
              <span className="cal-week-label">{WEEK_LABELS[index]}</span>
              <span className="cal-week-date-num">{day.date.getDate()}</span>
            </div>
            
            <div className="calendar-week-col-body">
              {dayTasks.length === 0 ? (
                <div className="calendar-week-empty-text">Click đúp để tạo</div>
              ) : (
                dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`calendar-week-card priority-${task.priority} ${task.completed ? 'completed' : ''} ${task.id === selectedTaskId ? 'selected' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(task.id);
                    }}
                  >
                    <div className="cal-week-card-title">{task.title}</div>
                    <div className="cal-week-card-meta">
                      {task.projectId && (
                        <span className="cal-week-proj-tag">
                          {getProjectName(task.projectId)}
                        </span>
                      )}
                      {task.pomodoroEstimate > 0 && (
                        <span>{task.pomodoroEstimate} 🍅</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        .calendar-week-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          flex: 1;
          min-height: 480px;
        }
        .calendar-week-col {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          transition: all var(--transition-fast);
          user-select: none;
        }
        .calendar-week-col:hover {
          border-color: var(--border-strong);
        }
        .calendar-week-col.today {
          border-color: var(--accent);
          box-shadow: 0 0 0 1px var(--accent);
          background: color-mix(in srgb, var(--accent) 2%, transparent);
        }
        .calendar-week-col.drag-over {
          background: color-mix(in srgb, var(--accent) 8%, transparent);
          border-style: dashed;
          border-color: var(--accent);
        }
        .calendar-week-col-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 6px;
          background: var(--bg-input, rgba(0, 0, 0, 0.02));
          border-bottom: 1px solid var(--border);
          gap: 4px;
        }
        .cal-week-label {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
        }
        .cal-week-date-num {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--text-primary);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .calendar-week-col.today .cal-week-date-num {
          background: var(--accent);
          color: #fff;
        }
        .calendar-week-col-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
          flex: 1;
          overflow-y: auto;
        }
        .calendar-week-empty-text {
          font-size: 9px;
          color: var(--text-tertiary);
          text-align: center;
          padding: 20px 0;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        .calendar-week-col:hover .calendar-week-empty-text {
          opacity: 0.6;
        }
        .calendar-week-card {
          padding: 8px;
          border-radius: 8px;
          background: var(--bg-input, rgba(0,0,0,0.02));
          border: 1px solid var(--border);
          cursor: grab;
          transition: all var(--transition-fast);
        }
        .calendar-week-card:hover {
          border-color: var(--border-strong);
          background: var(--bg-card-hover);
        }
        .calendar-week-card.selected {
          border-color: var(--accent);
          background: var(--task-bg-selected);
          box-shadow: 0 0 0 1px var(--accent);
        }
        .calendar-week-card.completed {
          opacity: 0.55;
          text-decoration: line-through;
        }
        .cal-week-card-title {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
          margin-bottom: 6px;
          word-break: break-word;
        }
        .cal-week-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9px;
          color: var(--text-tertiary);
        }
        .cal-week-proj-tag {
          background: var(--bg-input, rgba(0,0,0,0.05));
          padding: 1px 4px;
          border-radius: 3px;
        }
        .calendar-week-card.priority-high {
          border-left: 3px solid var(--priority-high, #ff4d4f);
          background: color-mix(in srgb, var(--priority-high, #ff4d4f) 6%, var(--bg-card));
        }
        .calendar-week-card.priority-medium {
          border-left: 3px solid var(--priority-medium, #ffa940);
          background: color-mix(in srgb, var(--priority-medium, #ffa940) 6%, var(--bg-card));
        }
        .calendar-week-card.priority-low {
          border-left: 3px solid var(--priority-low, #52c41a);
          background: color-mix(in srgb, var(--priority-low, #52c41a) 6%, var(--bg-card));
        }
      `}</style>
    </div>
  );
};

export default CalendarWeek;
