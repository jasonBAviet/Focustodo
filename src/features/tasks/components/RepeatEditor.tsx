import React, { useState } from 'react';
import type { Freq, Recurrence } from '@/utils/recurrence';
import { buildRRule, WEEKDAY_CODES, WEEKDAY_LABELS } from '@/utils/recurrence';

interface RepeatEditorProps {
  value: Recurrence | null;
  onChange: (repeat: string, repeatCustom: string | null) => void; // 'none' | 'custom'+RRULE
  onClose: () => void;
}

const FREQS: { value: Freq; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

// RRULE repeat editor: select frequency, interval, weekday, end date.
const RepeatEditor: React.FC<RepeatEditorProps> = ({ value, onChange, onClose }) => {
  const [rec, setRec] = useState<Recurrence>(
    value ?? { freq: 'WEEKLY', interval: 1, byday: [], until: null },
  );

  const apply = (next: Recurrence) => {
    setRec(next);
    onChange('custom', buildRRule(next));
  };

  const toggleDay = (code: string) => {
    const byday = rec.byday.includes(code)
      ? rec.byday.filter((d) => d !== code)
      : [...rec.byday, code];
    apply({ ...rec, byday });
  };

  return (
    <div className="repeat-editor" onClick={(e) => e.stopPropagation()}>
      <div className="re-row re-freq">
        {FREQS.map((f) => (
          <button
            key={f.value}
            className={`re-chip${rec.freq === f.value ? ' active' : ''}`}
            onClick={() => apply({ ...rec, freq: f.value })}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="re-row">
        <span className="re-label">Every</span>
        <input
          className="re-num"
          type="number"
          min={1}
          value={rec.interval}
          onChange={(e) => apply({ ...rec, interval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
        />
        <span className="re-label">{{ DAILY: 'day(s)', WEEKLY: 'week(s)', MONTHLY: 'month(s)', YEARLY: 'year(s)' }[rec.freq]}</span>
      </div>

      {rec.freq === 'WEEKLY' && (
        <div className="re-row re-days">
          {WEEKDAY_CODES.map((code) => (
            <button
              key={code}
              className={`re-day${rec.byday.includes(code) ? ' active' : ''}`}
              onClick={() => toggleDay(code)}
              title={WEEKDAY_LABELS[code]}
            >
              {WEEKDAY_LABELS[code][0]}
            </button>
          ))}
        </div>
      )}

      <div className="re-row">
        <span className="re-label">Until</span>
        <input
          className="re-date"
          type="date"
          value={rec.until ?? ''}
          onChange={(e) => apply({ ...rec, until: e.target.value || null })}
        />
        {rec.until && (
          <button className="re-clear-until" onClick={() => apply({ ...rec, until: null })}>×</button>
        )}
      </div>

      <div className="re-footer">
        <button className="re-btn re-none" onClick={() => { onChange('none', null); onClose(); }}>
          Remove repeat
        </button>
        <button className="re-btn re-done" onClick={onClose}>Done</button>
      </div>

      <style>{`
        .repeat-editor { padding: 12px; width: 280px; display: flex; flex-direction: column; gap: 10px; }
        .re-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .re-freq { gap: 6px; }
        .re-label { color: var(--text-secondary); font-size: var(--text-sm); }
        .re-chip {
          padding: 4px 10px; border-radius: var(--radius-full);
          border: 1px solid var(--border); background: transparent;
          color: var(--text-secondary); font-size: var(--text-xs); cursor: pointer;
          transition: all var(--transition-fast); font-family: var(--font-main);
        }
        .re-chip:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .re-chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
        .re-num {
          width: 56px; padding: 4px 8px; border-radius: var(--radius-md);
          border: 1px solid var(--border); background: var(--bg-input);
          color: var(--text-primary); font-family: var(--font-main); outline: none;
        }
        .re-days { gap: 4px; }
        .re-day {
          width: 30px; height: 30px; border-radius: 50%;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-secondary); cursor: pointer; font-size: var(--text-xs);
          transition: all var(--transition-fast);
        }
        .re-day:hover { border-color: var(--border-strong); }
        .re-day.active { background: var(--accent); border-color: var(--accent); color: #fff; }
        .re-date {
          padding: 4px 8px; border-radius: var(--radius-md);
          border: 1px solid var(--border); background: var(--bg-input);
          color: var(--text-primary); font-family: var(--font-main); outline: none;
        }
        .re-clear-until { background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 16px; }
        .re-footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 4px; }
        .re-btn {
          padding: 5px 12px; border-radius: var(--radius-md);
          border: 1px solid var(--border); background: transparent;
          color: var(--text-secondary); cursor: pointer; font-size: var(--text-xs);
          font-family: var(--font-main); transition: all var(--transition-fast);
        }
        .re-none:hover { border-color: var(--priority-high); color: var(--priority-high); }
        .re-done { background: var(--accent); border-color: var(--accent); color: #fff; }
      `}</style>
    </div>
  );
};

export default RepeatEditor;
