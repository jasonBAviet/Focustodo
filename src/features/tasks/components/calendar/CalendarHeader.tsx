import React from 'react';

interface CalendarHeaderProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  scale: 'month' | 'week' | 'day';
  setScale: (s: 'month' | 'week' | 'day') => void;
}

const IconChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const IconChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  setCurrentDate,
  scale,
  setScale,
}) => {
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (scale === 'month') {
      nextDate.setMonth(currentDate.getMonth() - 1);
    } else if (scale === 'week') {
      nextDate.setDate(currentDate.getDate() - 7);
    } else {
      nextDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (scale === 'month') {
      nextDate.setMonth(currentDate.getMonth() + 1);
    } else if (scale === 'week') {
      nextDate.setDate(currentDate.getDate() + 7);
    } else {
      nextDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(nextDate);
  };

  const formatHeaderLabel = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    if (scale === 'month') {
      return `Tháng ${month}, ${year}`;
    }
    if (scale === 'week') {
      // Tính tuần
      const day = currentDate.getDate();
      return `Tuần ${day}/${month}/${year}`;
    }
    return `Ngày ${currentDate.getDate()} Tháng ${month}, ${year}`;
  };

  return (
    <div className="calendar-header-bar">
      <div className="calendar-nav-section">
        <button className="cal-nav-btn" onClick={handleToday} title="Quay về hôm nay">
          Hôm nay
        </button>
        <div className="cal-nav-arrows">
          <button className="cal-nav-arrow-btn" onClick={handlePrev} title="Trước">
            <IconChevronLeft />
          </button>
          <button className="cal-nav-arrow-btn" onClick={handleNext} title="Sau">
            <IconChevronRight />
          </button>
        </div>
        <span className="calendar-current-label">{formatHeaderLabel()}</span>
      </div>

      <div className="calendar-scale-toggle">
        <button
          className={`cal-scale-btn ${scale === 'month' ? 'active' : ''}`}
          onClick={() => setScale('month')}
        >
          Tháng
        </button>
        <button
          className={`cal-scale-btn ${scale === 'week' ? 'active' : ''}`}
          onClick={() => setScale('week')}
        >
          Tuần
        </button>
        <button
          className={`cal-scale-btn ${scale === 'day' ? 'active' : ''}`}
          onClick={() => setScale('day')}
        >
          Ngày
        </button>
      </div>

      <style>{`
        .calendar-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          margin-bottom: 12px;
          backdrop-filter: blur(8px);
        }
        .calendar-nav-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cal-nav-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-secondary);
          font-size: var(--text-xs);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .cal-nav-btn:hover {
          border-color: var(--border-strong);
          color: var(--text-primary);
          background: var(--bg-card-hover);
        }
        .cal-nav-arrows {
          display: flex;
          gap: 4px;
        }
        .cal-nav-arrow-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          transition: all var(--transition-fast);
        }
        .cal-nav-arrow-btn:hover {
          color: var(--text-primary);
          background: var(--bg-card-hover);
          border-color: var(--border-strong);
        }
        .calendar-current-label {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
          margin-left: 8px;
        }
        .calendar-scale-toggle {
          display: flex;
          background: var(--bg-input, rgba(0,0,0,0.05));
          border-radius: 8px;
          padding: 2px;
          border: 1px solid var(--border);
        }
        .cal-scale-btn {
          padding: 4px 12px;
          font-size: var(--text-xs);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 6px;
          transition: all var(--transition-fast);
        }
        .cal-scale-btn.active {
          background: var(--bg-card);
          color: var(--text-primary);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
          font-weight: 500;
        }
        .cal-scale-btn:hover:not(.active) {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default CalendarHeader;
