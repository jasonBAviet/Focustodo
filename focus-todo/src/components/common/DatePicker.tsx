import React, { useState, useCallback } from 'react';

// ============================================================
// DATE PICKER INLINE COMPONENT
// ============================================================

export interface DatePickerProps {
  value: string | null;
  onChange: (isoDate: string) => void;
  onRemove?: () => void;
  onClose?: () => void;
}

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

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
}) => {
  const today = new Date();
  const todayStr = toLocalDateString(today);

  const initDate = value ? parseLocalDate(value) : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(value);

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
      onChange(selectedDate);
    }
    onClose?.();
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
          border: 1px solid var(--glass-border);
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
        .datepicker-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--divider);
          gap: var(--space-2);
        }
      `}</style>
      <div className="datepicker">
        {/* Header */}
        <div className="datepicker-header">
          <button
            type="button"
            className="datepicker-nav-btn"
            onClick={prevMonth}
            aria-label="Tháng trước"
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
            aria-label="Tháng sau"
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

        {/* Footer */}
        <div className="datepicker-footer">
          {onRemove && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleRemove}
            >
              Xóa
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary btn--sm"
            style={{ marginLeft: 'auto' }}
            onClick={handleOk}
          >
            Đồng ý
          </button>
        </div>
      </div>
    </>
  );
};

export default DatePicker;
