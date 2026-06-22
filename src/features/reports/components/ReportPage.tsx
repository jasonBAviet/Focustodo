import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/core/contexts/AppContext';
import { useTaskContext } from '@/features/tasks/TaskContext';
import DatePicker from '@/shared/components/DatePicker';
import StatCards from '@/features/reports/components/StatCards';
import FocusTimeChart from '@/features/reports/components/FocusTimeChart';
import TaskCompletionChart from '@/features/reports/components/TaskCompletionChart';
import type { ChartPeriod } from '@/features/reports/components/FocusTimeChart';
import GoalCalendar from '@/features/reports/components/GoalCalendar';
import PomodoroRecords from '@/features/reports/components/PomodoroRecords';
import ProjectTimeDistribution from '@/features/reports/components/ProjectTimeDistribution';
import TagTimeDistribution from '@/features/reports/components/TagTimeDistribution';
import PeakHoursHeatmap from '@/features/reports/components/PeakHoursHeatmap';
import { getPeriodRange, getPeriodLabel, toDateString, parseDateString } from '@/features/reports/components/reportHelpers';
import TaskActivityChart from '@/features/reports/components/TaskActivityChart';
import TaskActivityTable from '@/features/reports/components/TaskActivityTable';
import type { ActivityData } from '@/features/reports/components/taskActivityChartHelpers';

interface ReportPageProps {
  onClose?: () => void;
}

const ReportPage: React.FC<ReportPageProps> = ({ onClose }) => {
  const { settings } = useAppContext();
  const { folders, projects, tags } = useTaskContext();

  // Trạng thái bộ lọc thời gian toàn cục
  const [period, setPeriod] = useState<ChartPeriod>('weekly'); // Mặc định là tuần
  const [currentDate, setCurrentDate] = useState(new Date());

  // Trạng thái bộ lọc phân loại toàn cục
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedTagId, setSelectedTagId] = useState<string>('all');

  // Dữ liệu hoạt động task dùng chung cho biểu đồ và bảng chi tiết
  const [activityData, setActivityData] = useState<ActivityData[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Tính startDate, endDate
  const { start: startDate, end: endDate } = useMemo(() => {
    return getPeriodRange(period, currentDate);
  }, [period, currentDate]);

  // Danh sách dự án hiển thị trong dropdown (phụ thuộc vào folder được chọn)
  const filteredProjectsForSelect = useMemo(() => {
    if (selectedFolderId === 'all') return projects;
    return projects.filter(p => p.folderId === selectedFolderId);
  }, [projects, selectedFolderId]);

  // Reset bộ lọc cấp dưới khi cấp trên thay đổi
  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFolderId(e.target.value);
    setSelectedProjectId('all');
    setSelectedTagId('all');
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProjectId(e.target.value);
    setSelectedTagId('all');
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTagId(e.target.value);
  };

  return (
    <div className="report-page">
      {/* Header */}
      <div className="report-header">
        <h1 className="report-title">Performance Report</h1>
        <button
          className="icon-btn"
          onClick={() => onClose?.()}
          title="Close report"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Global Filters */}
      <div className="report-filters">
        <div>
          <label style={labelStyle}>Folder</label>
          <select value={selectedFolderId} onChange={handleFolderChange} style={selectStyle}>
            <option value="all">All folders</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Project</label>
          <select value={selectedProjectId} onChange={handleProjectChange} style={selectStyle}>
            <option value="all">All projects</option>
            {filteredProjectsForSelect.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Tag</label>
          <select value={selectedTagId} onChange={handleTagChange} style={selectStyle}>
            <option value="all">All tags</option>
            {tags.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Period</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as ChartPeriod)} style={selectStyle}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>Date picker</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}>
            <button
              type="button"
              style={datePickerStyle}
              onClick={() => setShowDatePicker((v) => !v)}
            >
              {toDateString(currentDate)}
            </button>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              ({getPeriodLabel(period, currentDate)})
            </span>
          </div>
          {showDatePicker && (
            <div className="rp-date-popover">
              <DatePicker
                value={toDateString(currentDate)}
                onChange={(d) => { setCurrentDate(parseDateString(d)); setShowDatePicker(false); }}
                onClose={() => setShowDatePicker(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Body container wrapper */}
      <div className="report-body">
        {/* Cấp độ 1: Tổng quan vĩ mô (Stat Cards) */}
        <StatCards 
          selectedFolderId={selectedFolderId}
          selectedProjectId={selectedProjectId}
          selectedTagId={selectedTagId}
          startDate={startDate}
          endDate={endDate}
          period={period}
        />

        {/* Row 2: Xu hướng thời gian + Hoàn thành */}
        <div className="report-grid-2">
          <div className="report-card">
            <h3 className="report-card-title">Focus Time</h3>
            <FocusTimeChart
              period={period}
              currentDate={currentDate}
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
            />
          </div>
          <div className="report-card">
            <h3 className="report-card-title">Completion Rate</h3>
            <TaskCompletionChart
              period={period}
              currentDate={currentDate}
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
            />
          </div>
        </div>

        {/* Row 3: Xu hướng hoạt động + Bảng chi tiết */}
        <div className="report-grid-2">
          <div className="report-card">
            <h3 className="report-card-title">Activity Trend</h3>
            <TaskActivityChart
              period={period}
              currentDate={currentDate}
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
              onDataCalculated={setActivityData}
            />
          </div>
          <div className="report-card">
            <h3 className="report-card-title">Activity Details</h3>
            <TaskActivityTable data={activityData} />
          </div>
        </div>

        {/* Row 4: Phân bổ & Chi tiết */}
        <div className="report-grid">
          <div className="report-card">
            <h3 className="report-card-title">Distribution by Project</h3>
            <ProjectTimeDistribution
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
              startDate={startDate}
              endDate={endDate}
            />
          </div>

          <div className="report-card">
            <h3 className="report-card-title">Distribution by Tag</h3>
            <TagTimeDistribution
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
              startDate={startDate}
              endDate={endDate}
            />
          </div>

          <div className="report-card">
            <h3 className="report-card-title">Peak Hours</h3>
            <PeakHoursHeatmap
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
              startDate={startDate}
              endDate={endDate}
            />
          </div>

          <div className="report-card">
            <GoalCalendar focusGoalHours={settings.dailyFocusGoalHours} />
          </div>

          <div className="report-card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="report-card-title">Pomodoro History</h3>
            <PomodoroRecords
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        </div>
      </div>

      <style>{`
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
          margin-top: 16px;
        }
        .report-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          padding: 16px 32px 20px;
          border-bottom: 1px solid var(--divider);
          background: var(--bg-card);
          margin-bottom: 20px;
        }
        .report-body { padding: 0 32px; }
        .report-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 16px;
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
        .rp-date-popover {
          position: absolute; left: 0; top: 100%; z-index: 200;
          animation: rp-slide-in 150ms ease both;
        }
        @keyframes rp-slide-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: 'var(--text-tertiary)',
  marginBottom: '6px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-main)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  transition: 'border-color 0.2s',
  cursor: 'pointer',
};

const datePickerStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-main)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'left',
};

export default ReportPage;
