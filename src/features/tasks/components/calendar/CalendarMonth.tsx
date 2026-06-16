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
      if (dateField === 'dueDate') {
        const startStr = t.startDate ? calendarUtils.toDateString(new Date(t.startDate)) : null;
        const dueStr = rawDate ? calendarUtils.toDateString(new Date(rawDate)) : null;
        if (startStr && dueStr) {
          return dateString >= startStr && dateString <= dueStr;
        } else if (dueStr) {
          return dateString === dueStr;
        } else if (startStr) {
          return dateString === startStr;
        }
        return false;
      }
      if (!rawDate) return false;
      const d = new Date(rawDate);
      const cellD = new Date(dateString);
      return calendarUtils.isSameDay(d, cellD);
    });
  };

  const handleDragStart = (e: React.DragEvent, taskId: string, type: 'start' | 'end' | 'all') => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.setData('drag-type', type);
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
    const dragType = e.dataTransfer.getData('drag-type') || 'all';
    
    if (taskId) {
      const targetDate = new Date(dateString);
      targetDate.setHours(9, 0, 0, 0);
      const targetIso = targetDate.toISOString();
      
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (dragType === 'start') {
        if (task.dueDate && targetIso > task.dueDate) {
          updateTask(taskId, { startDate: targetIso, dueDate: targetIso });
        } else {
          updateTask(taskId, { startDate: targetIso });
        }
      } else if (dragType === 'end') {
        if (task.startDate && targetIso < task.startDate) {
          updateTask(taskId, { startDate: targetIso, dueDate: targetIso });
        } else {
          updateTask(taskId, { dueDate: targetIso });
        }
      } else {
        if (task.startDate && task.dueDate) {
          const startD = new Date(task.startDate!);
          const dueD = new Date(task.dueDate!);
          const diffDays = Math.round((dueD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
          
          const newStart = new Date(dateString);
          newStart.setHours(9, 0, 0, 0);
          
          const newDue = new Date(newStart);
          newDue.setDate(newStart.getDate() + diffDays);
          
          updateTask(taskId, {
            startDate: newStart.toISOString(),
            dueDate: newDue.toISOString()
          });
        } else {
          updateTask(taskId, { dueDate: targetIso });
        }
      }
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
                {dayTasks.map((task) => {
                  const isSpanning = !!(task.startDate && task.dueDate && 
                    calendarUtils.toDateString(new Date(task.startDate)) !== calendarUtils.toDateString(new Date(task.dueDate)));
                  
                  return (
                    <div
                      key={task.id}
                      className={`calendar-task-badge priority-${task.priority} ${task.completed ? 'completed' : ''} ${task.id === selectedTaskId ? 'selected' : ''} ${isSpanning ? 'spanning' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id, 'all')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTask(task.id);
                      }}
                      title={`${task.title}${task.startDate ? `\nStart: ${calendarUtils.toDateString(new Date(task.startDate))}` : ''}${task.dueDate ? `\nDue: ${calendarUtils.toDateString(new Date(task.dueDate))}` : ''}`}
                    >
                      <span
                        className="calendar-task-handle start-handle"
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(e, task.id, 'start');
                        }}
                        title="Drag to change Start Date"
                      >
                        •
                      </span>
                      <span className="calendar-task-badge-title">{task.title}</span>
                      <span
                        className="calendar-task-handle end-handle"
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(e, task.id, 'end');
                        }}
                        title="Drag to change End Date"
                      >
                        •
                      </span>
                    </div>
                  );
                })}
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
          padding: 2px 4px;
          border-radius: 4px;
          background: var(--bg-input, rgba(0, 0, 0, 0.05));
          border: 1px solid var(--border);
          color: var(--text-primary);
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          overflow: visible;
          transition: all var(--transition-fast);
          gap: 2px;
        }
        .calendar-task-badge.spanning {
          background: color-mix(in srgb, var(--accent) 5%, var(--bg-input, rgba(0, 0, 0, 0.05)));
          border-style: dashed;
        }
        .calendar-task-badge-title {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .calendar-task-handle {
          width: 8px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: col-resize;
          font-size: 10px;
          font-weight: bold;
          color: var(--text-tertiary);
          opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast);
        }
        .calendar-task-badge:hover .calendar-task-handle {
          opacity: 0.7;
        }
        .calendar-task-handle:hover {
          opacity: 1 !important;
          color: var(--accent);
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
