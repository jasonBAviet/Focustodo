import React, { useState, useCallback, useEffect } from 'react';
import './DatePicker.css';

// ============================================================
// DATE PICKER INLINE COMPONENT WITH RANGE SELECTION
// ============================================================

export interface DatePickerProps {
  // Single selection mode
  value?: string | null;
  onChange?: (isoDateTime: string) => void;

  // Range selection mode
  isRange?: boolean;
  startDateValue?: string | null;
  endDateValue?: string | null;
  onRangeChange?: (startIso: string | null, endIso: string | null) => void;

  onRemove?: () => void;
  onClose?: () => void;
  showTime?: boolean;
}

const DAY_LABELS = ['W', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
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

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

interface CalendarCellInfo {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  dateString: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  isRange = false,
  startDateValue,
  endDateValue,
  onRangeChange,
  onRemove,
  onClose,
  showTime = false,
}) => {
  const today = new Date();
  const todayStr = toLocalDateString(today);

  // Initial date for viewing
  const getInitialViewDate = () => {
    if (isRange) {
      if (startDateValue) return parseLocalDate(startDateValue.split('T')[0]);
      if (endDateValue) return parseLocalDate(endDateValue.split('T')[0]);
    } else {
      if (value) return parseLocalDate(value.split('T')[0]);
    }
    return today;
  };

  const initDate = getInitialViewDate();
  const initTime = value && value.includes('T') ? value.split('T')[1].slice(0, 5) : '09:00';

  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  // Single mode state
  const [selectedDate, setSelectedDate] = useState<string | null>(value?.split('T')[0] || null);
  const [selectedTime, setSelectedTime] = useState(initTime);

  // Range mode state
  const [tempStart, setTempStart] = useState<string | null>(null);
  const [tempEnd, setTempEnd] = useState<string | null>(null);

  // Synchronize range state when props change or popover opens
  useEffect(() => {
    if (isRange) {
      setTempStart(startDateValue ? startDateValue.split('T')[0] : null);
      setTempEnd(endDateValue ? endDateValue.split('T')[0] : null);
    }
  }, [isRange, startDateValue, endDateValue]);

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

  // Build calendar grid of 42 days (6 weeks) starting from Monday, including adjacent month days
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday, 1 = Monday...
  const daysBefore = firstDay === 0 ? 6 : firstDay - 1;
  const gridStartDate = new Date(viewYear, viewMonth, 1 - daysBefore);
  
  const cells: CalendarCellInfo[] = [];
  for (let i = 0; i < 42; i++) {
    const currDate = new Date(gridStartDate);
    currDate.setDate(gridStartDate.getDate() + i);
    cells.push({
      date: currDate,
      dayNum: currDate.getDate(),
      isCurrentMonth: currDate.getMonth() === viewMonth,
      dateString: toLocalDateString(currDate),
    });
  }

  const handleDayClick = (dateString: string) => {
    if (isRange) {
      if (!tempStart || (tempStart && tempEnd)) {
        setTempStart(dateString);
        setTempEnd(null);
      } else {
        if (dateString < tempStart) {
          setTempEnd(tempStart);
          setTempStart(dateString);
        } else {
          setTempEnd(dateString);
        }
      }
    } else {
      setSelectedDate(dateString);
    }
  };

  const handleOk = () => {
    if (isRange) {
      if (onRangeChange) {
        // Convert to ISO 9:00 AM (default)
        const startIso = tempStart ? new Date(`${tempStart}T09:00:00`).toISOString() : null;
        const endIso = tempEnd ? new Date(`${tempEnd}T09:00:00`).toISOString() : null;
        onRangeChange(startIso, endIso);
      }
      onClose?.();
    } else {
      if (selectedDate && onChange) {
        const result = showTime ? `${selectedDate}T${selectedTime}` : selectedDate;
        onChange(result);
      }
      onClose?.();
    }
  };

  const handleRemove = () => {
    if (isRange) {
      if (onRangeChange) {
        onRangeChange(null, null);
      }
      setTempStart(null);
      setTempEnd(null);
      onClose?.();
    } else {
      setSelectedDate(null);
      onRemove?.();
      onClose?.();
    }
  };

  return (
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
        {DAY_LABELS.map((d, idx) => (
          <div key={d} className={idx === 0 ? 'datepicker-weekday--weeknum' : 'datepicker-weekday'}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="datepicker-grid">
        {Array.from({ length: 6 }).map((_, r) => {
          const weekStartCell = cells[r * 7];
          const weekNum = getWeekNumber(weekStartCell.date);
          const weekDays = cells.slice(r * 7, r * 7 + 7);

          return (
            <React.Fragment key={r}>
              <div className="datepicker-cell--weeknum" role="presentation">
                {weekNum}
              </div>
              {weekDays.map((cell) => {
                const isToday = cell.dateString === todayStr;
                const isPast = cell.dateString < todayStr;
                
                let isSelected = false;
                let isRangeStart = false;
                let isRangeEnd = false;
                let isRangeMid = false;

                if (isRange) {
                  isRangeStart = cell.dateString === tempStart;
                  isRangeEnd = cell.dateString === tempEnd;
                  if (tempStart && tempEnd) {
                    isRangeMid = cell.dateString > tempStart && cell.dateString < tempEnd;
                  }
                } else {
                  isSelected = cell.dateString === selectedDate;
                }

                const cellClass = [
                  'datepicker-cell',
                  !cell.isCurrentMonth ? 'datepicker-cell--other-month' : '',
                  isSelected ? 'datepicker-cell--selected' : '',
                  isRangeStart ? 'datepicker-cell--range-start' : '',
                  isRangeEnd ? 'datepicker-cell--range-end' : '',
                  isRangeMid ? 'datepicker-cell--range-mid' : '',
                  !isSelected && !isRangeStart && !isRangeEnd && isToday ? 'datepicker-cell--today' : '',
                  !isSelected && !isRangeStart && !isRangeEnd && !isRangeMid && !isToday && isPast ? 'datepicker-cell--past' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div
                    key={cell.dateString}
                    className={cellClass}
                    onClick={() => handleDayClick(cell.dateString)}
                    role="button"
                    tabIndex={0}
                    aria-label={cell.dateString}
                    onKeyDown={(e) => e.key === 'Enter' && handleDayClick(cell.dateString)}
                  >
                    {cell.dayNum}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Time picker (optional) */}
      {!isRange && showTime && (
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
        {(onRemove || isRange) && (
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
  );
};

export default DatePicker;
