import React, { useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useTaskContext } from '../../contexts/TaskContext';
import StatCards from './StatCards';
import FocusTimeChart from './FocusTimeChart';
import TaskCompletionChart from './TaskCompletionChart';
import type { ChartPeriod } from './FocusTimeChart';
import GoalCalendar from './GoalCalendar';
import PomodoroRecords from './PomodoroRecords';
import ProjectTimeDistribution from './ProjectTimeDistribution';
import TagTimeDistribution from './TagTimeDistribution';
import PeakHoursHeatmap from './PeakHoursHeatmap';

const PERIODS: { value: ChartPeriod; label: string }[] = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

interface ReportPageProps {
  onClose?: () => void;
}

const ReportPage: React.FC<ReportPageProps> = ({ onClose }) => {
  const { settings } = useAppContext();
  const { folders, projects, tags } = useTaskContext();

  // Thống kê đếm ngược Pomodoro
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('daily');
  const [chartDate, setChartDate] = useState(new Date());

  // Thống kê hoàn thành Task/Subtask
  const [completionPeriod, setCompletionPeriod] = useState<ChartPeriod>('daily');
  const [completionDate, setCompletionDate] = useState(new Date());

  // Trạng thái bộ lọc toàn cục
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedTagId, setSelectedTagId] = useState<string>('all');

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

  const handleCompletionNavigate = useCallback((dir: -1 | 1) => {
    setCompletionDate((prev) => {
      const d = new Date(prev);
      switch (completionPeriod) {
        case 'daily': d.setDate(d.getDate() + dir); break;
        case 'weekly': d.setDate(d.getDate() + dir * 7); break;
        case 'monthly': d.setMonth(d.getMonth() + dir); break;
        case 'yearly': d.setFullYear(d.getFullYear() + dir); break;
      }
      return d;
    });
  }, [completionPeriod]);

  return (
    <div className="report-page">
      {/* Header */}
      <div className="report-header">
        <h1 className="report-title">Báo cáo hiệu suất</h1>
        <button
          className="icon-btn"
          onClick={() => onClose?.()}
          title="Đóng báo cáo"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Global Filters */}
      <div className="report-filters">
        <div>
          <label style={labelStyle}>Thư mục</label>
          <select value={selectedFolderId} onChange={handleFolderChange} style={selectStyle}>
            <option value="all">Tất cả thư mục</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Dự án</label>
          <select value={selectedProjectId} onChange={handleProjectChange} style={selectStyle}>
            <option value="all">Tất cả dự án</option>
            {filteredProjectsForSelect.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Nhãn</label>
          <select value={selectedTagId} onChange={handleTagChange} style={selectStyle}>
            <option value="all">Tất cả nhãn</option>
            {tags.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Body container wrapper */}
      <div className="report-body">
        {/* Cấp độ 1: Tổng quan vĩ mô (Stat Cards) */}
        <StatCards 
          selectedFolderId={selectedFolderId}
          selectedProjectId={selectedProjectId}
          selectedTagId={selectedTagId}
        />

        {/* Cấp độ 2: Xu hướng & Tăng trưởng (Grid of 2 charts) */}
        <div className="report-grid-2">
          {/* Focus Time Chart */}
          <div className="report-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="report-card-title" style={{ marginBottom: 0 }}>Thời gian tập trung</h3>
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
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
            />
          </div>

          {/* Task Completion & Growth Chart */}
          <div className="report-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="report-card-title" style={{ marginBottom: 0 }}>Hiệu suất & Tăng trưởng công việc</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    className="report-period-btn"
                    data-active={completionPeriod === p.value}
                    onClick={() => setCompletionPeriod(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <TaskCompletionChart
              period={completionPeriod}
              currentDate={completionDate}
              onNavigate={handleCompletionNavigate}
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
            />
          </div>
        </div>

        {/* Cấp độ 3: Phân bổ & Chi tiết */}
        <div className="report-grid" style={{ padding: '20px 0 0', alignItems: 'start' }}>
          <div className="report-card">
            <h3 className="report-card-title">Phân bổ thời gian theo dự án</h3>
            <ProjectTimeDistribution 
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
            />
          </div>
          
          <div className="report-card">
            <h3 className="report-card-title">Phân bổ thời gian theo nhãn</h3>
            <TagTimeDistribution 
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
            />
          </div>

          <div className="report-card">
            <h3 className="report-card-title">Khung giờ làm việc vàng</h3>
            <PeakHoursHeatmap 
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
            />
          </div>

          <div className="report-card">
            <GoalCalendar focusGoalHours={settings.dailyFocusGoalHours} />
          </div>

          <div className="report-card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="report-card-title">Lịch sử chu kỳ Pomodoro</h3>
            <PomodoroRecords 
              selectedFolderId={selectedFolderId}
              selectedProjectId={selectedProjectId}
              selectedTagId={selectedTagId}
            />
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
          padding: 0;
        }
        .report-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
          gap: 20px;
          margin-top: 20px;
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

export default ReportPage;
