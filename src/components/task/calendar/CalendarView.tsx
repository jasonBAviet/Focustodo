import React, { useState } from 'react';
import { useTaskContext } from '../../../contexts/TaskContext';
import CalendarHeader from './CalendarHeader';
import CalendarMonth from './CalendarMonth';
import CalendarWeek from './CalendarWeek';
import CalendarDay from './CalendarDay';
import UnscheduledSidebar from './UnscheduledSidebar';

const CalendarView: React.FC = () => {
  const {
    getFilteredTasks,
    selectedTaskId,
    setSelectedTaskId,
  } = useTaskContext();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [scale, setScale] = useState<'month' | 'week' | 'day'>('month');

  const filteredTasks = getFilteredTasks();

  return (
    <div className="calendar-view-container">
      <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        scale={scale}
        setScale={setScale}
      />

      <div className="calendar-view-content-wrapper">
        <div className="calendar-grid-area">
          {scale === 'month' && (
            <CalendarMonth
              currentDate={currentDate}
              tasks={filteredTasks}
              onSelectTask={setSelectedTaskId}
              selectedTaskId={selectedTaskId}
            />
          )}
          {scale === 'week' && (
            <CalendarWeek
              currentDate={currentDate}
              tasks={filteredTasks}
              onSelectTask={setSelectedTaskId}
              selectedTaskId={selectedTaskId}
            />
          )}
          {scale === 'day' && (
            <CalendarDay
              currentDate={currentDate}
              tasks={filteredTasks}
              onSelectTask={setSelectedTaskId}
              selectedTaskId={selectedTaskId}
            />
          )}
        </div>

        <UnscheduledSidebar
          tasks={filteredTasks}
          onSelectTask={setSelectedTaskId}
          selectedTaskId={selectedTaskId}
        />
      </div>

      <style>{`
        .calendar-view-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 8px;
        }
        .calendar-view-content-wrapper {
          display: flex;
          gap: 16px;
          flex: 1;
          height: calc(100% - 70px);
          min-height: 0;
        }
        .calendar-grid-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100%;
        }
        
        @media (max-width: 768px) {
          .calendar-view-content-wrapper {
            flex-direction: column-reverse;
            overflow-y: auto;
          }
          .calendar-grid-area {
            height: auto;
          }
          .unscheduled-sidebar {
            width: 100% !important;
            height: 250px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CalendarView;
