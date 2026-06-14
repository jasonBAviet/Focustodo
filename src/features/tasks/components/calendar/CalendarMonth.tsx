import React, { useState } from 'react';
import type { Task } from '@/types';
import { calendarUtils } from '@/features/tasks/components/calendar/calendarUtils';
import { useTaskContext } from '@/features/tasks/TaskContext';

interface CalendarMonthProps {
  currentDate: Date;
  tasks: Task[];
  onSelectTask: (id: string) => void;
  selectedTaskId: string | null;
  dateField: 'dueDate' | 'createdAt';
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CalendarMonth: React.FC<CalendarMonthProps> = ({
  currentDate,
  tasks,
  onSelectTask,
  selectedTaskId,
  dateField,
}) => {
  const { addTask, updateTask } = useTaskContext();
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysGrid = calendarUtils.getMonthGrid(year, month);

  const getTasksForDate = (dateString: string) => {
    return tasks.filter((t) => {
      const rawDate = t[dateField];
      if (!rawDate) return false;
      const d = new Date(rawDate);
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
      // Update task dueDate
      const targetDate = new Date(dateString);
      // Default to 9:00 AM
      targetDate.setHours(9, 0, 0, 0);
      updateTask(taskId, { dueDate: targetDate.toISOString() });
    }
  };

  const handleDoubleClick = (dateString: string) => {
    const title = window.prompt('Enter new task title:');
    if (title && title.trim()) {
      const targetDate = new Date(dateString);
      targetDate.setHours(9, 0, 0, 0);
      const newTask = addTask(title.trim(), null, 'none', 1);
      updateTask(newTask.id, { dueDate: targetDate.toISOString() });
    }
  };

  return (
    <div className="calendar-month-grid">
      <div className="calendar-grid-header">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="calendar-grid-header-cell">{d}</div>
        ))}
      </div>

      <div className="calendar-grid-body">
        {daysGrid.map((day) => {
          const dayTasks = getTasksForDate(day.dateString);
          const isDragOver = dragOverDate === day.dateString;

          return (
            <div
              key={day.dateString}
              className={`calendar-cell ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, day.dateString)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.dateString)}
              onDoubleClick={() => handleDoubleClick(day.dateString)}
            >
              <div className="calendar-cell-header">
                <span className="calendar-day-number">{day.date.getDate()}</span>
              </div>
              <div className="calendar-cell-tasks">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`calendar-task-badge priority-${task.priority} ${task.completed ? 'completed' : ''} ${task.id === selectedTaskId ? 'selected' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(task.id);
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .calendar-month-grid {
          display: flex;
          flex-direction: column;
          flex: 1;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          backdrop-filter: blur(8px);
        }
        .calendar-grid-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: var(--bg-input, rgba(0, 0, 0, 0.02));
          border-bottom: 1px solid var(--border);
        }
        .calendar-grid-header-cell {
          text-align: center;
          padding: 10px 0;
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
        }
        .calendar-grid-body {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: repeat(6, 1fr);
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .calendar-cell {
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow: hidden;
          background: transparent;
          transition: background var(--transition-fast);
          user-select: none;
        }
        .calendar-cell:nth-child(7n) {
          border-right: none;
        }
        .calendar-cell:nth-last-child(-n+7) {
          border-bottom: none;
        }
        .calendar-cell.other-month {
          background: var(--bg-input, rgba(0, 0, 0, 0.01));
          opacity: 0.5;
        }
        .calendar-cell:hover {
          background: var(--bg-card-hover);
        }
        .calendar-cell.today {
          background: color-mix(in srgb, var(--accent) 3%, transparent);
        }
        .calendar-cell.today .calendar-day-number {
          background: var(--accent);
          color: #fff;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .calendar-cell.drag-over {
          background: color-mix(in srgb, var(--accent) 10%, transparent);
        }
        .calendar-cell-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        .calendar-day-number {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }
        .calendar-cell-tasks {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          overflow: hidden;
        }
        .calendar-task-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--bg-input, rgba(0, 0, 0, 0.05));
          border: 1px solid var(--border);
          color: var(--text-primary);
          cursor: grab;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: all var(--transition-fast);
        }
        .calendar-task-badge:hover {
          border-color: var(--border-strong);
          filter: brightness(0.95);
        }
        .calendar-task-badge.selected {
          border-color: var(--accent);
          background: var(--task-bg-selected);
          box-shadow: 0 0 0 1px var(--accent);
        }
        .calendar-task-badge.completed {
          text-decoration: line-through;
          opacity: 0.6;
        }
        .calendar-task-badge.priority-high {
          background: color-mix(in srgb, var(--priority-high, #ff4d4f) 12%, var(--bg-card));
          border-left: 2px solid var(--priority-high, #ff4d4f);
        }
        .calendar-task-badge.priority-medium {
          background: color-mix(in srgb, var(--priority-medium, #ffa940) 12%, var(--bg-card));
          border-left: 2px solid var(--priority-medium, #ffa940);
        }
        .calendar-task-badge.priority-low {
          background: color-mix(in srgb, var(--priority-low, #52c41a) 12%, var(--bg-card));
          border-left: 2px solid var(--priority-low, #52c41a);
        }
      `}</style>
    </div>
  );
};

export default CalendarMonth;
