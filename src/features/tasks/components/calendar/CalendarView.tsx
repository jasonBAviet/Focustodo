import React from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useAppContext } from '@/core/contexts/AppContext';
import CalendarHeader from '@/features/tasks/components/calendar/CalendarHeader';
import CalendarMonth from '@/features/tasks/components/calendar/CalendarMonth';
import CalendarWeek from '@/features/tasks/components/calendar/CalendarWeek';
import CalendarDay from '@/features/tasks/components/calendar/CalendarDay';
import TaskFilterBar from '@/features/tasks/components/TaskFilterBar';

const CalendarView: React.FC = () => {
  const {
    getFilteredTasks,
    selectedTaskId,
    setSelectedTaskId,
  } = useTaskContext();

  const { settings, updateSettings } = useAppContext();

  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());

  const scale = settings.calendarScale;
  const dateField = settings.calendarDateField;

  const setScale = (s: 'month' | 'week' | 'day') => updateSettings({ calendarScale: s });
  const setDateField = (f: 'dueDate' | 'createdAt') => updateSettings({ calendarDateField: f });

  const filteredTasks = getFilteredTasks();

  return (
    <div className="calendar-view-container">
      <TaskFilterBar />

      <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        scale={scale}
        setScale={setScale}
        dateField={dateField}
        setDateField={setDateField}
      />

      <div className="calendar-grid-area">
        {scale === 'month' && (
          <CalendarMonth
            currentDate={currentDate}
            tasks={filteredTasks}
            onSelectTask={setSelectedTaskId}
            selectedTaskId={selectedTaskId}
            dateField={dateField}
          />
        )}
        {scale === 'week' && (
          <CalendarWeek
            currentDate={currentDate}
            tasks={filteredTasks}
            onSelectTask={setSelectedTaskId}
            selectedTaskId={selectedTaskId}
            dateField={dateField}
          />
        )}
        {scale === 'day' && (
          <CalendarDay
            currentDate={currentDate}
            tasks={filteredTasks}
            onSelectTask={setSelectedTaskId}
            selectedTaskId={selectedTaskId}
            dateField={dateField}
          />
        )}
      </div>

      <style>{`
        .calendar-view-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 8px;
        }
        .calendar-grid-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
        }
      `}</style>
    </div>
  );
};

export default CalendarView;
