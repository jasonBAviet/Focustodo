import React, { useState, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import StatCards from './StatCards';
import FocusTimeChart from './FocusTimeChart';
import type { ChartPeriod } from './FocusTimeChart';
import GoalCalendar from './GoalCalendar';
import PomodoroRecords from './PomodoroRecords';

const PERIODS: { value: ChartPeriod; label: string }[] = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

const ReportPage: React.FC = () => {
  const { setOpenModal, settings } = useAppContext();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('daily');
  const [chartDate, setChartDate] = useState(new Date());

  const handleChartNavigate = useCallback((dir: -1 | 1) => {
    setChartDate((prev) => {
      const d = new Date(prev);
      switch (chartPeriod) {
        case 'daily': d.setDate(d.getDate() + dir); break;
        case 'weekly': d.setDate(d.getDate() + dir * 7); break;
        case 'monthly': d.setMonth(d.getMonth() + dir); break;
        case 'yearly': d.setFullYear(d.getFullYear() + dir); break;
      }
      return d;
    });
  }, [chartPeriod]);

  return (
    <div className="report-page">
      {/* Header */}
      <div className="report-header">
        <h1 className="report-title">Report</h1>
        <button
          className="icon-btn"
          onClick={() => setOpenModal(null)}
          title="Close report"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Stat Cards */}
      <StatCards />

      {/* Charts Grid */}
      <div className="report-grid">
        {/* Left column */}
        <div className="report-col-left">
          <div className="report-card">
            <h3 className="report-card-title">Pomodoro Records</h3>
            <PomodoroRecords />
          </div>
          <div className="report-card">
            <h3 className="report-card-title">Project Time Distribution</h3>
            <div className="report-empty">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="4" width="32" height="32" rx="4" stroke="var(--border-strong)" strokeWidth="1.5"/>
                <path d="M12 20h4v8h-4zM18 14h4v14h-4zM24 17h4v11h-4z" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>No Data</span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="report-col-right">
          <div className="report-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="report-card-title" style={{ marginBottom: 0 }}>Focus Time</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    className="report-period-btn"
                    data-active={chartPeriod === p.value}
                    onClick={() => setChartPeriod(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <FocusTimeChart
              period={chartPeriod}
              currentDate={chartDate}
              onNavigate={handleChartNavigate}
            />
          </div>
          <div className="report-card">
            <GoalCalendar focusGoalHours={settings.dailyFocusGoalHours} />
          </div>
        </div>
      </div>

      <style>{`
        .report-period-btn {
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-secondary);
          font-size: var(--text-xs);
          font-family: var(--font-main);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .report-period-btn[data-active="true"] {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        .report-period-btn:hover:not([data-active="true"]) {
          border-color: var(--border-strong);
          color: var(--text-primary);
        }
        .report-page {
          height: 100vh; overflow-y: auto;
          background: var(--bg-main);
          padding: 0 0 40px;
        }
        .report-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 32px 16px;
          position: sticky; top: 0;
          background: var(--bg-main);
          z-index: 10;
          border-bottom: 1px solid var(--divider);
        }
        .report-title {
          font-size: var(--text-xl); font-weight: 600;
          color: var(--text-primary);
        }
        .report-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 16px 32px;
        }
        .report-col-left, .report-col-right {
          display: flex; flex-direction: column; gap: 16px;
        }
        .report-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
        }
        .report-card-title {
          font-size: var(--text-md); font-weight: 600;
          color: var(--text-primary); margin-bottom: 16px;
        }
        .report-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; padding: 40px 0;
          color: var(--text-tertiary); font-size: var(--text-sm);
        }
        .icon-btn {
          background: none; border: none; cursor: pointer;
          color: var(--text-tertiary); padding: 6px; border-radius: 6px;
          display: flex; transition: all var(--transition-fast);
        }
        .icon-btn:hover { color: var(--text-primary); background: var(--glass-bg-hover); }
      `}</style>
    </div>
  );
};

export default ReportPage;
