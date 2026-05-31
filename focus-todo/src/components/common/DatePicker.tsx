import React, { useState, useCallback } from 'react';

// ============================================================
// DATE PICKER INLINE COMPONENT
// ============================================================

export interface DatePickerProps {
  value: string | null;
  onChange: (isoDateTime: string) => void;
  onRemove?: () => void;
  onClose?: () => void;
  showTime?: boolean;
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  onRemove,
  onClose,
  showTime = false,
}) => {
  const today = new Date();
  const todayStr = toLocalDateString(today);

  const initDate = value ? parseLocalDate(value.split('T')[0]) : today;
  const initTime = value && value.includes('T') ? value.split('T')[1].slice(0, 5) : '09:00';
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(value?.split('T')[0] || null);
  const [selectedTime, setSelectedTime] = useState(initTime);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete grid rows
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayClick = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const handleOk = () => {
    if (selectedDate) {
      const result = showTime ? `${selectedDate}T${selectedTime}` : selectedDate;
      onChange(result);
      onClose?.();
    }
  };

  const handleRemove = () => {
    setSelectedDate(null);
    onRemove?.();
    onClose?.();
  };

  return (
    <>
      <style>{`
        .datepicker {
          background: var(--bg-card);
          border: none;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          padding: var(--space-4);
          width: 260px;
          user-select: none;
        }
        .datepicker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }
        .datepicker-month-label {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .datepicker-nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .datepicker-nav-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .datepicker-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: var(--space-1);
        }
        .datepicker-weekday {
          text-align: center;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          font-weight: 500;
          padding: var(--space-1) 0;
        }
        .datepicker-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .datepicker-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 30px;
          border-radius: 50%;
          font-size: var(--text-sm);
          cursor: pointer;
          color: var(--text-primary);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .datepicker-cell:hover:not(.datepicker-cell--empty) {
          background: var(--bg-card-hover);
        }
        .datepicker-cell--empty {
          cursor: default;
        }
        .datepicker-cell--today {
          color: var(--accent);
          font-weight: 600;
          border: 2px solid var(--accent);
          background: transparent;
        }
        .datepicker-cell--selected {
          background: var(--accent) !important;
          color: var(--text-on-accent) !important;
          font-weight: 600;
          border: none;
        }
        .datepicker-cell--past {
          color: var(--text-tertiary);
        }
        .datepicker-time-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: var(--space-3);
          padding-bottom: var(--space-2);
          justify-content: center;
        }
        .datepicker-time-row select {
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          color: var(--text-primary);
          font-size: var(--text-sm);
          cursor: pointer;
          font-family: var(--font-main);
          min-width: 50px;
        }
        .datepicker-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--divider);
          gap: var(--space-2);
        }
        .datepicker-btn {
          background: none;
          border: none;
          padding: 4px 8px;
          font-size: var(--text-sm);
          font-family: var(--font-main);
          cursor: pointer;
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          transition: color var(--transition-fast);
        }
        .datepicker-btn:hover {
          color: var(--text-primary);
        }
        .datepicker-btn--confirm {
          color: var(--accent);
          font-weight: 500;
        }
        .datepicker-btn--confirm:hover {
          color: var(--accent);
          opacity: 0.8;
        }
      `}</style>
      <div className="datepicker">
        {/* Header */}
        <div className="datepicker-header">
          <button
            type="button"
            className="datepicker-nav-btn"
            onClick={prevMonth}
            aria-label="Previous month"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="datepicker-month-label">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            className="datepicker-nav-btn"
            onClick={nextMonth}
            aria-label="Next month"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Weekday labels */}
        <div className="datepicker-weekdays">
          {DAY_LABELS.map((d) => (
            <div key={d} className="datepicker-weekday">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="datepicker-grid">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="datepicker-cell datepicker-cell--empty" />;
            }
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const isPast = dateStr < todayStr;

            const cellClass = [
              'datepicker-cell',
              isSelected ? 'datepicker-cell--selected' : '',
              !isSelected && isToday ? 'datepicker-cell--today' : '',
              !isSelected && !isToday && isPast ? 'datepicker-cell--past' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={dateStr}
                className={cellClass}
                onClick={() => handleDayClick(day)}
                role="button"
                tabIndex={0}
                aria-label={dateStr}
                aria-pressed={isSelected}
                onKeyDown={(e) => e.key === 'Enter' && handleDayClick(day)}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Time picker (optional) */}
        {showTime && (
          <div className="datepicker-time-row">
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Time:</label>
            <select
              value={selectedTime.split(':')[0]}
              onChange={(e) => setSelectedTime(`${e.target.value}:${selectedTime.split(':')[1]}`)}
              style={{ flex: 0 }}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span style={{ color: 'var(--text-secondary)' }}>:</span>
            <select
              value={selectedTime.split(':')[1]}
              onChange={(e) => setSelectedTime(`${selectedTime.split(':')[0]}:${e.target.value}`)}
              style={{ flex: 0 }}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Footer */}
        <div className="datepicker-footer">
          {onRemove && (
            <button
              type="button"
              className="datepicker-btn"
              onClick={handleRemove}
            >
              Remove
            </button>
          )}
          <button
            type="button"
            className="datepicker-btn datepicker-btn--confirm"
            style={{ marginLeft: 'auto' }}
            onClick={handleOk}
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  );
};

export default DatePicker;
