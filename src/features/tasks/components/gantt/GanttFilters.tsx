import React, { useState } from 'react';
import type { Folder, Project, Tag } from '@/types';
import type { GanttPeriod } from './ganttUtils';
import { addMonthsClamped } from './ganttUtils';
import { getPeriodLabel, toDateString, parseDateString } from '@/features/reports/components/reportHelpers';
import DatePicker from '@/shared/components/DatePicker';

interface GanttFiltersProps {
  folders: Folder[];
  projects: Project[];
  tags: Tag[];
  selectedFolderId: string;
  selectedProjectId: string;
  selectedTagId: string;
  selectedStatus: string;
  period: GanttPeriod;
  currentDate: Date;
  viewRange: number;
  onFolderChange: (id: string) => void;
  onProjectChange: (id: string) => void;
  onTagChange: (id: string) => void;
  onStatusChange: (status: string) => void;
  onPeriodChange: (period: GanttPeriod) => void;
  onDateChange: (date: Date) => void;
  onViewRangeChange: (range: number) => void;
}

const GanttFilters: React.FC<GanttFiltersProps> = ({
  folders,
  projects,
  tags,
  selectedFolderId,
  selectedProjectId,
  selectedTagId,
  selectedStatus,
  period,
  currentDate,
  viewRange,
  onFolderChange,
  onProjectChange,
  onTagChange,
  onStatusChange,
  onPeriodChange,
  onDateChange,
  onViewRangeChange,
}) => {
  // Lọc danh sách dự án dựa trên thư mục được chọn
  const filteredProjects = React.useMemo(() => {
    if (selectedFolderId === 'all') return projects;
    return projects.filter(p => p.folderId === selectedFolderId);
  }, [projects, selectedFolderId]);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleNavigate = (direction: -1 | 1) => {
    let newDate = new Date(currentDate);
    if (period === 'daily') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (period === 'weekly') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else if (period === 'monthly') {
      newDate = addMonthsClamped(newDate, direction);
    } else if (period === 'yearly') {
      newDate = addMonthsClamped(newDate, direction * 12);
    }
    onDateChange(newDate);
  };

  return (
    <div className="gantt-filters">
      <div className="filter-group">
        <label style={labelStyle}>Thư mục</label>
        <select
          value={selectedFolderId}
          onChange={(e) => onFolderChange(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Tất cả thư mục</option>
          {folders.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label style={labelStyle}>Dự án</label>
        <select
          value={selectedProjectId}
          onChange={(e) => onProjectChange(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Tất cả dự án</option>
          {filteredProjects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label style={labelStyle}>Nhãn (Tag)</label>
        <select
          value={selectedTagId}
          onChange={(e) => onTagChange(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Tất cả nhãn</option>
          {tags.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label style={labelStyle}>Status</label>
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Tất cả status</option>
          <option value="not-started">Chưa bắt đầu</option>
          <option value="in-progress">Đang thực hiện</option>
          <option value="completed-early-or-on-time">Hoàn thành sớm / Đúng hạn</option>
          <option value="completed-late">Hoàn thành trễ</option>
          <option value="overdue">Quá hạn</option>
        </select>
      </div>

      <div className="filter-group">
        <label style={labelStyle}>Chế độ xem</label>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as GanttPeriod)}
          style={selectStyle}
        >
          <option value="daily">Hàng ngày</option>
          <option value="weekly">Hàng tuần</option>
          <option value="monthly">Hàng tháng</option>
          <option value="yearly">Hàng năm</option>
        </select>
      </div>

      <div className="filter-group">
        <label style={labelStyle}>Phạm vi hiển thị</label>
        <select
          value={viewRange}
          onChange={(e) => onViewRangeChange(Number(e.target.value))}
          style={selectStyle}
        >
          {period === 'daily' && (
            <>
              <option value={7}>7 ngày</option>
              <option value={14}>14 ngày</option>
              <option value={30}>30 ngày</option>
            </>
          )}
          {period === 'weekly' && (
            <>
              <option value={1}>1 tuần</option>
              <option value={2}>2 tuần</option>
              <option value={4}>4 tuần</option>
              <option value={8}>8 tuần</option>
            </>
          )}
          {period === 'monthly' && (
            <>
              <option value={1}>1 tháng</option>
              <option value={3}>3 tháng</option>
              <option value={6}>6 tháng</option>
            </>
          )}
          {period === 'yearly' && (
            <>
              <option value={1}>1 năm</option>
              <option value={2}>2 năm</option>
              <option value={3}>3 năm</option>
            </>
          )}
        </select>
      </div>

      <div className="filter-group date-picker-group" style={{ position: 'relative' }}>
        <label style={labelStyle}>Chọn ngày</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px' }}>
          <button
            type="button"
            className="gantt-nav-btn"
            onClick={() => handleNavigate(-1)}
            title="Trước"
          >
            &lt;
          </button>
          <button
            type="button"
            style={datePickerStyle}
            onClick={() => setShowDatePicker((v) => !v)}
            title="Chọn ngày cụ thể"
          >
            {toDateString(currentDate)}
          </button>
          <button
            type="button"
            className="gantt-nav-btn"
            onClick={() => handleNavigate(1)}
            title="Sau"
          >
            &gt;
          </button>
          <span className="period-label" style={{ marginLeft: '4px' }}>
            ({getPeriodLabel(period as any, currentDate)})
          </span>
        </div>
        {showDatePicker && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 199,
                background: 'transparent',
              }}
              onClick={() => setShowDatePicker(false)}
            />
            <div className="gantt-date-popover">
              <DatePicker
                value={toDateString(currentDate)}
                onChange={(d) => { onDateChange(parseDateString(d)); setShowDatePicker(false); }}
                onClose={() => setShowDatePicker(false)}
              />
            </div>
          </>
        )}
      </div>

      <style>{`
        .gantt-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          margin-bottom: 0px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }
        .gantt-nav-btn {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-main);
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-weight: bold;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
        }
        .gantt-nav-btn:hover {
          border-color: var(--accent);
          background: var(--bg-card-hover);
          color: var(--accent);
        }
        .filter-group {
          display: flex;
          flex-direction: column;
        }
        .period-label {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          font-weight: 500;
          white-space: nowrap;
        }
        @media (max-width: 768px) {
          .gantt-filters {
            grid-template-columns: 1fr 1fr;
          }
          .date-picker-group {
            grid-column: span 2;
          }
        }
        .gantt-date-popover {
          position: absolute; left: 0; top: 100%; z-index: 200;
          animation: gantt-slide-in 150ms ease both;
        }
        @keyframes gantt-slide-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
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

export default GanttFilters;
